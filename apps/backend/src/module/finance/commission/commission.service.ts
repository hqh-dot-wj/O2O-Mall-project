import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CommissionCalculatorService } from './services/commission-calculator.service';
import { CommissionSettlerService } from './services/commission-settler.service';
import { CommissionValidatorService } from './services/commission-validator.service';
import { DistConfigService } from './services/dist-config.service';

/**
 * 佣金服务门面
 * 职责：协调各子服务，对外提供统一接口
 * 
 * 架构：
 * - DistConfigService: 配置管理
 * - CommissionValidatorService: 校验逻辑
 * - CommissionCalculatorService: 计算协调
 * - CommissionSettlerService: 结算/回滚
 */
@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(
    private readonly calculator: CommissionCalculatorService,
    private readonly settler: CommissionSettlerService,
    private readonly validator: CommissionValidatorService,
    private readonly configService: DistConfigService,
    @InjectQueue('CALC_COMMISSION') private readonly commissionQueue: Queue,
  ) {}

  /**
   * 触发佣金计算 (异步任务)
   * 在支付成功回调中调用
   */
  async triggerCalculation(orderId: string, tenantId: string) {
    await this.commissionQueue.add(
      { orderId, tenantId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );
    this.logger.log(`Commission calculation queued for order ${orderId}`);
  }

  /**
   * 获取租户分销配置
   * 委托给 DistConfigService
   */
  async getDistConfig(tenantId: string) {
    return this.configService.getDistConfig(tenantId);
  }

  /**
   * 检查是否自购 (不返佣)
   * 委托给 CommissionValidatorService
   */
  checkSelfPurchase(memberId: string, shareUserId: string | null, parentId: string | null): boolean {
    return this.validator.checkSelfPurchase(memberId, shareUserId, parentId);
  }

  /**
   * 计算佣金 (由 Processor 调用)
   * 委托给 CommissionCalculatorService
   */
  async calculateCommission(orderId: string, tenantId: string) {
    return this.calculator.calculateCommission(orderId, tenantId);
  }

  /**
   * 查询订单佣金列表
   * 委托给 CommissionSettlerService
   */
  async getCommissionsByOrder(orderId: string) {
    return this.settler.getCommissionsByOrder(orderId);
  }

  /**
   * 取消订单佣金 (退款时调用)
   * 委托给 CommissionSettlerService
   * 
   * @param orderId 订单ID
   * @param itemIds 可选,指定要退款的商品ID列表,支持部分退款
   */
  async cancelCommissions(orderId: string, itemIds?: number[]) {
    return this.settler.cancelCommissions(orderId, itemIds);
  }

  /**
   * 更新计划结算时间 (订单确认收货/核销时调用)
   * 委托给 CommissionSettlerService
   */
  async updatePlanSettleTime(orderId: string, eventType: 'CONFIRM' | 'VERIFY') {
    return this.settler.updatePlanSettleTime(orderId, eventType);
  }

  /**
   * 检查循环推荐 (绑定推荐人时调用)
   * 委托给 CommissionValidatorService
   */
  async checkCircularReferral(memberId: string, parentId: string): Promise<boolean> {
    return this.validator.checkCircularReferral(memberId, parentId);
  }
}
