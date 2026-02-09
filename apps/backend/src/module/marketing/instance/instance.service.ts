import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PlayInstanceRepository } from './instance.repository';
import { CreatePlayInstanceDto, ListPlayInstanceDto } from './dto/instance.dto';
import { Result } from 'src/common/response/result';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { PlayInstanceStatus } from '@prisma/client';
import { WalletService } from 'src/module/finance/wallet/wallet.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { UserAssetService } from '../asset/asset.service';
import { PlayStrategyFactory } from '../play/play.factory';
import { FormatDateFields } from 'src/common/utils';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { ConfigService } from 'src/module/admin/system/config/config.service';
import { IdempotencyService } from './idempotency.service';
import {
  isValidTransition,
  getStatusDescription,
  getAllowedNextStatuses,
} from './state-machine.config';
import { MarketingEventEmitter } from '../events/marketing-event.emitter';
import { MarketingEventType } from '../events/marketing-event.types';
import { ResponseCode } from 'src/common/response/response.interface';
import { GrayReleaseService } from '../gray/gray-release.service';

@Injectable()
export class PlayInstanceService {
  constructor(
    private readonly repo: PlayInstanceRepository,
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
    private readonly assetService: UserAssetService,
    private readonly configService: ConfigService,
    private readonly idempotencyService: IdempotencyService,
    private readonly eventEmitter: MarketingEventEmitter,
    private readonly grayReleaseService: GrayReleaseService,
    @Inject(forwardRef(() => PlayStrategyFactory))
    private readonly strategyFactory: PlayStrategyFactory,
  ) {}

  /**
   * 分页查询实例
   * @param query 查询过滤参数
   */
  async findAll(query: ListPlayInstanceDto) {
    const { rows, total } = await this.repo.search(query);
    // ✅ 中文注释：统一日期格式化，返回给前端稳定的 VO 结构
    return Result.page(FormatDateFields(rows), total);
  }

  /**
   * 查询实例详情 (包含策略增强数据)
   * @param id 实例ID
   */
  async findOne(id: string) {
    const instance = (await this.repo.findById(id, { include: { config: true } })) as any;
    BusinessException.throwIfNull(instance, '营销实例不存在');

    // ✅ 中文注释：策略模式应用 - 获取特定玩法需要的个性化展示数据（如拼团进度）
    const strategy = this.strategyFactory.getStrategy(instance.templateCode);
    let displayData = null;
    if (strategy.getDisplayData && instance.config) {
      displayData = await strategy.getDisplayData(instance.config);
    }

    return Result.ok(
      FormatDateFields({
        ...instance,
        displayData,
      }),
    );
  }

  /**
   * 参与活动 (创建实例)
   *
   * @description
   * 用户点击参与活动时调用，创建初始化状态为 PENDING_PAY 的记录
   * 
   * ✅ 新增功能：
   * 1. 幂等性保障 - 防止用户重复点击导致创建多个实例
   * 2. 灰度发布检查 - 检查用户是否在灰度范围内
   * 3. 事件发送 - 发送 INSTANCE_CREATED 事件
   */
  @Transactional()
  async create(dto: CreatePlayInstanceDto) {
    // === 1. 幂等性检查 ===
    // 检查用户是否在短时间内重复参与同一活动
    const cachedResult = await this.idempotencyService.checkJoinIdempotency(
      dto.configId,
      dto.memberId,
      dto.instanceData,
    );

    if (cachedResult) {
      // 返回缓存的结果，避免重复创建
      return cachedResult;
    }

    // === 2. 获取活动配置 ===
    const config = await this.prisma.storePlayConfig.findUnique({
      where: { id: dto.configId },
    });
    BusinessException.throwIfNull(config, '活动配置不存在');

    // === 3. 灰度发布检查 ===
    // 检查用户是否在灰度范围内（白名单、门店白名单、按比例灰度）
    const isInGrayRelease = await this.grayReleaseService.isInGrayRelease(
      config,
      dto.memberId,
      config.storeId,
    );

    if (!isInGrayRelease) {
      throw new BusinessException(
        ResponseCode.BUSINESS_ERROR,
        '该活动暂未对您开放，敬请期待',
      );
    }

    // === 4. 策略校验 (Strategy Pattern) ===
    // 检查用户是否有资格参与（如：是否在活动时间内、是否满足参与条件等）
    const strategy = this.strategyFactory.getStrategy(config.templateCode);
    await strategy.validateJoin(config, dto.memberId, dto.instanceData);

    // === 5. 执行创建，初始状态设为待支付 ===
    const instance = await this.repo.create({
      ...dto,
      status: PlayInstanceStatus.PENDING_PAY,
    });

    // === 6. 发送实例创建事件 ===
    // 使用 emitAsync() 异步发送，不阻塞主流程
    await this.eventEmitter.emitAsync({
      type: MarketingEventType.INSTANCE_CREATED,
      instanceId: instance.id,
      configId: instance.configId,
      memberId: instance.memberId,
      payload: {
        templateCode: config.templateCode,
        instanceData: instance.instanceData,
      },
      timestamp: new Date(),
    });

    // === 7. 缓存结果用于幂等性返回 ===
    const result = Result.ok(FormatDateFields(instance));
    await this.idempotencyService.cacheJoinResult(
      dto.configId,
      dto.memberId,
      dto.instanceData,
      result,
    );

    return result;
  }

  /**
   * 状态流转机 (State Machine)
   * 
   * @description
   * 营销实例的核心状态管理方法，确保状态跃迁的合法性和一致性
   * 
   * ✅ 新增功能：
   * 1. 状态机约束 - 防止非法状态跃迁
   * 2. 分布式锁 - 防止并发状态变更
   * 3. 事件发送 - 发送状态变更事件
   * 4. 详细日志 - 记录状态变更历史
   * 
   * @param id 实例ID
   * @param nextStatus 目标状态
   * @param extraData 附加数据
   */
  @Transactional()
  async transitStatus(id: string, nextStatus: PlayInstanceStatus, extraData?: any) {
    // === 1. 使用分布式锁防止并发状态变更 ===
    return await this.idempotencyService.withStateLock(id, async () => {
      // === 2. 查询当前实例 ===
      const instance = await this.repo.findById(id);
      BusinessException.throwIfNull(instance, '营销实例不存在');

      const currentStatus = instance.status;

      // === 3. 状态机约束：检查状态跃迁是否合法 ===
      if (!isValidTransition(currentStatus, nextStatus)) {
        const allowedStatuses = getAllowedNextStatuses(currentStatus);
        throw new BusinessException(
          ResponseCode.BUSINESS_ERROR,
          `非法的状态流转: ${currentStatus} -> ${nextStatus}。` +
            `当前状态 "${getStatusDescription(currentStatus)}" 只允许跃迁到: ${allowedStatuses.join(', ')}`,
        );
      }

      // === 4. 执行状态变更 ===
      // 使用事务确保状态变更与后续副作用（入账、发放权益）的原子性
      const updated = await this.repo.updateStatus(id, nextStatus, extraData);

      // === 5. 通用业务逻辑：状态流转到 SUCCESS 时，自动执行分账和发券 ===
      if (nextStatus === PlayInstanceStatus.SUCCESS) {
        await this.creditToStore(updated);
      }

      // === 6. 策略生命周期勾子 (Strategy Hook) ===
      // 处理特定玩法的自定义副作用（如：拼团满员通知、秒杀库存释放等）
      const strategy = this.strategyFactory.getStrategy(instance.templateCode);
      await strategy.onStatusChange(updated, currentStatus, nextStatus);

      // === 7. 发送状态变更事件 ===
      // 根据不同的状态跃迁发送对应的事件
      await this.emitStatusChangeEvent(updated, currentStatus, nextStatus);

      return Result.ok(FormatDateFields(updated));
    });
  }

  /**
   * 发送状态变更事件
   * 
   * @description
   * 根据状态跃迁类型发送对应的事件
   * 使用 emitAsync() 异步发送，不阻塞主流程
   * 
   * @param instance 实例数据
   * @param oldStatus 旧状态
   * @param newStatus 新状态
   */
  private async emitStatusChangeEvent(
    instance: any,
    oldStatus: PlayInstanceStatus,
    newStatus: PlayInstanceStatus,
  ): Promise<void> {
    const payload = {
      oldStatus,
      newStatus,
      instanceData: instance.instanceData,
      orderSn: (instance.instanceData as any)?.orderSn,
      amount: (instance.instanceData as any)?.price,
    };

    // 根据新状态发送对应的事件
    // 使用 emitAsync() 异步发送，不阻塞主流程
    let eventType: MarketingEventType | null = null;

    switch (newStatus) {
      case PlayInstanceStatus.PAID:
        eventType = MarketingEventType.INSTANCE_PAID;
        break;

      case PlayInstanceStatus.SUCCESS:
        eventType = MarketingEventType.INSTANCE_SUCCESS;
        break;

      case PlayInstanceStatus.FAILED:
        eventType = MarketingEventType.INSTANCE_FAILED;
        break;

      case PlayInstanceStatus.TIMEOUT:
        eventType = MarketingEventType.INSTANCE_TIMEOUT;
        break;

      case PlayInstanceStatus.REFUNDED:
        eventType = MarketingEventType.INSTANCE_REFUNDED;
        break;

      default:
        // 其他状态不发送事件
        return;
    }

    // 发送事件
    if (eventType) {
      await this.eventEmitter.emitAsync({
        type: eventType,
        instanceId: instance.id,
        configId: instance.configId,
        memberId: instance.memberId,
        payload,
        timestamp: new Date(),
      });
    }
  }

  /**
   * 批量状态流转
   */
  @Transactional()
  async batchTransitStatus(ids: string[], nextStatus: PlayInstanceStatus, extraData?: any) {
    if (ids.length === 0) return;

    // 1. 批量更新状态
    await this.repo.batchUpdateStatus(ids, nextStatus, extraData);

    // 2. 如果是 SUCCESS，批量执行分账和发券
    if (nextStatus === PlayInstanceStatus.SUCCESS) {
      // 需要查询出实例详情以获取 configContext 进行分账
      const instances = await this.repo.findMany({ where: { id: { in: ids } } });
      for (const instance of instances) {
        // TODO: 可考虑异步队列处理以提升性能
        await this.creditToStore(instance);
      }
    }
  }

  /**
   * 自动分账入账 (Store Wallet) + 权益自动发放 (User Asset)
   */
  // private readonly PLATFORM_FEE_RATE = new Decimal(0.01); // Moved to system config

  /**
   * 自动分账入账 (Store Wallet) + 权益自动发放 (User Asset)
   */
  private async creditToStore(instance: any) {
    // 1. 查询关联配置获取门店ID
    const config = await this.prisma.storePlayConfig.findUnique({
      where: { id: instance.configId },
    });
    if (!config || !config.storeId) return;

    // === A. 资金入账 (Wallet) ===
    const amount = new Decimal((instance.instanceData as any)?.price || 0);
    if (amount.gt(0)) {
      // 获取平台费率配置
      const feeRateStr = await this.configService.getSystemConfigValue('marketing.fee_rate');
      const feeRate = new Decimal(feeRateStr || 0.01);

      const platformFee = amount.mul(feeRate);
      const settleAmount = amount.minus(platformFee);

      // 4. 获取/创建门店钱包 (Store 视为一种特殊的 Member ID)
      // 约定：门店钱包的 memberId = `STORE_${storeId}`
      const storeMemberId = `STORE_${config.storeId}`;
      const wallet = await this.walletService.getOrCreateWallet(storeMemberId, instance.tenantId);

      await this.walletService.addBalance(
        storeMemberId,
        settleAmount,
        instance.id,
        `营销活动收入: ${instance.templateCode}`,
      );
    }

    // === B. 权益发放 (Asset) ===
    // 假设 rules: { giftAssetId: 'coupon_template_123', giftCount: 1 }
    const rules = config.rules as any;
    if (rules?.giftAssetId) {
      await this.assetService.grantAsset({
        tenantId: instance.tenantId,
        memberId: instance.memberId,
        instanceId: instance.id,
        configId: instance.configId,
        assetName: rules.giftAssetName || '活动赠送权益',
        assetType: 'VOUCHER', // 暂定
        balance: new Decimal(rules.giftCount || 1),
        initialBalance: new Decimal(rules.giftCount || 1),
        status: 'UNUSED',
      });
    }
  }

  /**
   * 支付成功回调处理
   * 
   * @description
   * 支付平台回调时调用，处理支付成功后的业务逻辑
   * 
   * ✅ 新增功能：幂等性保障
   * - 防止支付平台重复回调导致重复处理
   * - 10分钟内重复回调直接返回
   */
  @Transactional()
  async handlePaymentSuccess(orderSn: string) {
    // === 1. 幂等性检查 ===
    // 检查该订单是否已经处理过
    const processed = await this.idempotencyService.checkPaymentIdempotency(orderSn);
    if (processed) {
      // 已处理，直接返回（防止重复回调）
      return;
    }

    // === 2. 查询实例 ===
    const instance = await this.repo.findByOrderSn(orderSn);
    if (!instance) return;

    // === 3. 标记为已处理 ===
    await this.idempotencyService.markPaymentProcessed(orderSn);

    // === 4. 流转到 PAID 状态 ===
    await this.transitStatus(instance.id, PlayInstanceStatus.PAID);

    // === 5. 触发策略的回调 (Strategy Hook) ===
    // 例如：拼团逻辑会增加人数，判断是否满员 -> 自动流转 SUCCESS
    const strategy = this.strategyFactory.getStrategy(instance.templateCode);
    await strategy.onPaymentSuccess(instance);
  }

  /**
   * 校验状态流转是否允许
   * 
   * @deprecated 已迁移到 state-machine.config.ts 的 isValidTransition 函数
   * @see isValidTransition
   */
  private checkTransition(current: PlayInstanceStatus, next: PlayInstanceStatus): boolean {
    return isValidTransition(current, next);
  }
}
