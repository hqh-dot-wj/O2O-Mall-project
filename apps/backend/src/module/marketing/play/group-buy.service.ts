import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PlayInstanceService } from '../instance/instance.service';
import { PlayInstanceRepository } from '../instance/instance.repository';
import { PlayInstanceStatus, StorePlayConfig, PlayInstance } from '@prisma/client';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ResponseCode } from 'src/common/response/response.interface';
import { MarketingStockService } from '../stock/stock.service';
import { IMarketingStrategy } from './strategy.interface';
import { Decimal } from '@prisma/client/runtime/library';
import { GroupBuyJoinDto, GroupBuyRulesDto } from './dto/group-buy.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PlayStrategy } from './play-strategy.decorator';

/**
 * 拼团玩法核心逻辑
 */
@Injectable()
@PlayStrategy('GROUP_BUY')
export class GroupBuyService implements IMarketingStrategy {
  readonly code = 'GROUP_BUY';

  constructor(
    @Inject(forwardRef(() => PlayInstanceService))
    private readonly instanceService: PlayInstanceService,
    private readonly repo: PlayInstanceRepository,
    private readonly stockService: MarketingStockService,
  ) {}

  /**
   * 1.1 配置校验
   */
  async validateConfig(dto: any): Promise<void> {
    const rules = dto.rules;
    BusinessException.throwIf(!rules, '规则配置不能为空');

    const rulesDto = plainToInstance(GroupBuyRulesDto, rules);
    const errors = await validate(rulesDto);

    if (errors.length > 0) {
      const constraints = errors[0].constraints;
      const msg = constraints ? Object.values(constraints)[0] : '规则配置校验失败';
      throw new BusinessException(ResponseCode.PARAM_INVALID, msg);
    }

    // 额外逻辑：最大人数不能小于最小人数
    if (rulesDto.maxCount !== undefined && rulesDto.minCount !== undefined && rulesDto.maxCount < rulesDto.minCount) {
      throw new BusinessException(ResponseCode.PARAM_INVALID, '最大人数不能小于最小人数');
    }
  }

  /**
   * 1. 准入校验
   */
  async validateJoin(config: StorePlayConfig, memberId: string, params: any = {}): Promise<void> {
    const joinDto = plainToInstance(GroupBuyJoinDto, params);
    // 可选：严格校验
    // const errors = await validate(joinDto);
    // if (errors.length > 0) ...

    const { groupId } = joinDto;

    // 如果是参团，检查父团状态
    if (groupId) {
      const parentInstance = await this.instanceService.findOne(groupId);
      BusinessException.throwIfNull(parentInstance?.data, '拼团不存在');

      const parentData = parentInstance.data.instanceData as any;
      if (parentData.currentCount >= parentData.targetCount) {
        throw new BusinessException(ResponseCode.BUSINESS_ERROR, '该团已满员');
      }
    }

    // 检查库存 (实际业务中可能在此预占库存，或留到下单环节)
    // await this.stockService.check(config.id, 1);
  }

  /**
   * 2. 计算价格
   */
  async calculatePrice(config: StorePlayConfig, params: any): Promise<Decimal> {
    const rules = config.rules as any;
    let price = new Decimal(rules.price || 0);

    // 1. 优先使用 SKU 维度的配置
    if (params.skuId && Array.isArray(rules.skus)) {
      const skuRule = rules.skus.find((s: any) => s.skuId === params.skuId);
      if (skuRule && skuRule.price) {
        price = new Decimal(skuRule.price);
      }
    }

    return price;
  }

  /**
   * 3. 支付成功回调 (拼团核心逻辑: 进度推进)
   */
  async onPaymentSuccess(instance: PlayInstance): Promise<void> {
    await this.handleGroupUpdate(instance);
  }

  /**
   * 4. 状态流转钩子
   */
  async onStatusChange(instance: PlayInstance, oldStatus: string, newStatus: string): Promise<void> {
    // 拼团成功后，可能需要通知团长等额外操作
    // 通用的资金结算和权益发放由 PlayInstanceService 统一处理，此处仅处理特有逻辑
  }

  /**
   * 5. 前端展示增强数据
   */
  async getDisplayData(config: StorePlayConfig): Promise<any> {
    const rules = config.rules as any;
    return {
      price: rules.price,
      minCount: rules.minCount || 2,
      maxCount: rules.maxCount,
      validDays: rules.validDays || 24,
      skus: rules.skus || [],
    };
  }

  /**
   * @deprecated Legacy method, kept for reference or internal use
   */
  async joinGroup(memberId: string, configId: string, groupId?: string): Promise<any> {
    // ... (Legacy logic can be removed or adapted if needed)
    // 目前 joinGroup 的逻辑应该上浮到 PlayInstanceService.create 中调用 validateJoin
    return null;
  }

  /**
   * 处理拼团进度更新 (内部逻辑)
   */
  private async handleGroupUpdate(instance: PlayInstance) {
    const data = instance.instanceData as any;

    // 1. 确定团长ID
    const leaderId = data.isLeader ? instance.id : data.parentId;
    if (!leaderId) return;

    // 2. 获取团长实例
    const leaderRes = await this.instanceService.findOne(leaderId);
    const leader = leaderRes.data;
    if (!leader) return;

    // 3. 增加成团人数
    const leaderData = leader.instanceData as any;
    const newCount = leaderData.currentCount + 1;

    // 更新团长数据
    await this.repo.update(leaderId, {
      instanceData: { ...leaderData, currentCount: newCount },
    });

    // 4. 判断是否成团
    if (newCount >= leaderData.targetCount) {
      await this.finalizeGroup(leaderId);
    } else {
      // 尚未成团，状态保持 (或如果是成员，状态流转为 ACTIVE)
      if (instance.status !== PlayInstanceStatus.ACTIVE) {
        await this.instanceService.transitStatus(instance.id, PlayInstanceStatus.ACTIVE);
      }
      // 如果是团长自己，也更新为 ACTIVE
      if (data.isLeader && leader.status !== PlayInstanceStatus.ACTIVE) {
        await this.instanceService.transitStatus(leaderId, PlayInstanceStatus.ACTIVE);
      }
    }
  }

  /**
   * 团满处理
   */
  private async finalizeGroup(leaderId: string) {
    // 1. 找齐所有相关实例
    const instances = await this.repo.findMany({
      where: {
        OR: [{ id: leaderId }, { instanceData: { path: ['parentId'], equals: leaderId } }],
        status: {
          in: [PlayInstanceStatus.PAID, PlayInstanceStatus.ACTIVE],
        },
      },
    });

    // 2. 批量流转状态 -> SUCCESS
    const ids = instances.map((ins) => ins.id);
    if (ids.length > 0) {
      await this.instanceService.batchTransitStatus(ids, PlayInstanceStatus.SUCCESS);
    }
  }
}
