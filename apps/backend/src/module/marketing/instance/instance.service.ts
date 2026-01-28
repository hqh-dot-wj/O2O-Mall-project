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
import { Transactional } from 'src/common/decorators/transactional.decorator'; // 使用声明式事务

import { ConfigService } from 'src/module/admin/system/config/config.service';

@Injectable()
export class PlayInstanceService {
  constructor(
    private readonly repo: PlayInstanceRepository,
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
    private readonly assetService: UserAssetService,
    private readonly configService: ConfigService,
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
   * @description 用户点击参与活动时调用，创建初始化状态为 PENDING_PAY 的记录
   */
  @Transactional()
  async create(dto: CreatePlayInstanceDto) {
    // 1. 获取活动配置
    const config = await this.prisma.storePlayConfig.findUnique({
      where: { id: dto.configId },
    });
    BusinessException.throwIfNull(config, '活动配置不存在');

    // 2. 策略校验 (Strategy Pattern) - 检查用户是否有资格参与
    const strategy = this.strategyFactory.getStrategy(config.templateCode);
    await strategy.validateJoin(config, dto.memberId, dto.instanceData);

    // 3. 执行创建，初始状态设为待支付
    const instance = await this.repo.create({
      ...dto,
      status: PlayInstanceStatus.PENDING_PAY,
    });
    return Result.ok(FormatDateFields(instance));
  }

  /**
   * 状态流转机 (State Machine)
   * @param id 实例ID
   * @param nextStatus 目标状态
   * @param extraData 附加数据
   */
  @Transactional()
  async transitStatus(id: string, nextStatus: PlayInstanceStatus, extraData?: any) {
    const instance = await this.repo.findById(id);
    BusinessException.throwIfNull(instance, '营销实例不存在');

    const currentStatus = instance.status;

    // ✅ 中文注释：严格的状态流转校验，防止非法跳过业务阶段
    const isValidTransition = this.checkTransition(currentStatus, nextStatus);
    BusinessException.throwIf(!isValidTransition, `非法的状态流转: ${currentStatus} -> ${nextStatus}`);

    // 使用事务确保状态变更与后续副作用（入账、发放权益）的原子性
    const updated = await this.repo.updateStatus(id, nextStatus, extraData);

    // 2. 通用业务逻辑：状态流转到 SUCCESS 时，自动执行分账和发券
    if (nextStatus === PlayInstanceStatus.SUCCESS) {
      await this.creditToStore(updated);
    }

    // 3. 策略生命周期勾子 (Strategy Hook) - 处理特定玩法的自定义副作用
    const strategy = this.strategyFactory.getStrategy(instance.templateCode);
    await strategy.onStatusChange(updated, currentStatus, nextStatus);

    return Result.ok(FormatDateFields(updated));
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
   */
  @Transactional()
  async handlePaymentSuccess(orderSn: string) {
    const instance = await this.repo.findByOrderSn(orderSn);
    if (!instance) return;

    // 1. 流转到 PAID 状态
    await this.transitStatus(instance.id, PlayInstanceStatus.PAID);

    // 2. 触发策略的回调 (Strategy Hook)
    // e.g. 拼团逻辑：增加人数，判断是否满员 -> 自动流转 SUCCESS
    const strategy = this.strategyFactory.getStrategy(instance.templateCode);
    await strategy.onPaymentSuccess(instance);
  }

  /**
   * 校验状态流转是否允许
   */
  private checkTransition(current: PlayInstanceStatus, next: PlayInstanceStatus): boolean {
    const transitions: Record<PlayInstanceStatus, PlayInstanceStatus[]> = {
      [PlayInstanceStatus.PENDING_PAY]: [PlayInstanceStatus.PAID, PlayInstanceStatus.TIMEOUT],
      [PlayInstanceStatus.PAID]: [PlayInstanceStatus.ACTIVE, PlayInstanceStatus.REFUNDED, PlayInstanceStatus.SUCCESS],
      [PlayInstanceStatus.ACTIVE]: [PlayInstanceStatus.SUCCESS, PlayInstanceStatus.FAILED, PlayInstanceStatus.REFUNDED],
      [PlayInstanceStatus.SUCCESS]: [], // 终态
      [PlayInstanceStatus.TIMEOUT]: [], // 终态
      [PlayInstanceStatus.FAILED]: [PlayInstanceStatus.REFUNDED], // 失败后可退款
      [PlayInstanceStatus.REFUNDED]: [], // 终态
    };

    return transitions[current]?.includes(next) ?? false;
  }
}
