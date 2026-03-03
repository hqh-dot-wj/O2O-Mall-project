import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderType } from '@prisma/client';
import { Transactional, IsolationLevel } from 'src/common/decorators/transactional.decorator';
import { CommissionRepository } from '../commission.repository';
import { DistConfigService } from './dist-config.service';
import { CommissionValidatorService } from './commission-validator.service';
import { BaseCalculatorService } from './base-calculator.service';
import { L1CalculatorService } from './l1-calculator.service';
import { L2CalculatorService } from './l2-calculator.service';
import { CommissionRecord } from 'src/common/types/finance.types';
import { ProductConfigService } from 'src/module/store/distribution/services/product-config.service';
import { OrderQueryPort } from '../../ports/order-query.port';
import { MemberQueryPort } from '../../ports/member-query.port';

/**
 * 佣金计算协调服务
 *
 * @description
 * 协调各计算器完成佣金计算。
 * 通过 Port/Adapter 模式解耦对 OMS 和 UMS 模块的直接依赖。
 *
 * @architecture
 * - A-T1: 通过 OrderQueryPort 获取订单数据
 * - A-T2: 通过 MemberQueryPort 获取会员数据
 */
@Injectable()
export class CommissionCalculatorService {
  private readonly logger = new Logger(CommissionCalculatorService.name);

  constructor(
    private readonly commissionRepo: CommissionRepository,
    private readonly configService: DistConfigService,
    private readonly validator: CommissionValidatorService,
    private readonly baseCalculator: BaseCalculatorService,
    private readonly l1Calculator: L1CalculatorService,
    private readonly l2Calculator: L2CalculatorService,
    private readonly productConfigService: ProductConfigService,
    private readonly orderQueryPort: OrderQueryPort,
    private readonly memberQueryPort: MemberQueryPort,
  ) {}

  /**
   * 计算佣金 (由 Processor 调用)
   *
   * @description
   * 采用 @Transactional 保证数据一致性
   * 1. 验证订单有效性及自购情形
   * 2. 计算佣金基数（支持原价/实付/兑换商品）
   * 3. 计算并生成 L1/L2 佣金记录
   * 4. 熔断保护：总佣金不超过实付金额的配置比例
   *
   * @concurrency 使用 RepeatableRead 隔离级别防止并发超限
   * @transaction 跨店限额检查使用 FOR UPDATE 行锁保证原子性
   */
  @Transactional({ isolationLevel: IsolationLevel.RepeatableRead })
  async calculateCommission(orderId: string, tenantId: string) {
    // 1. 通过 Port 获取订单详情（A-T1: 解耦对 omsOrder 的直接访问）
    const order = await this.orderQueryPort.findOrderForCommission(orderId);

    if (!order) {
      this.logger.warn(`[Commission] Order ${orderId} not found`);
      return;
    }

    // 2. 通过 Port 获取下单人及其推荐关系链（A-T2: 解耦对 umsMember 的直接访问）
    const member = await this.memberQueryPort.findMemberForCommission(order.memberId);

    if (!member) return;

    // 3. 自购检测 (自购不返佣)
    if (this.validator.checkSelfPurchase(order.memberId, order.shareUserId, member.parentId)) {
      this.logger.log(`[Commission] Order ${orderId} is self-purchase, skip`);
      return;
    }

    // 4. 获取分销配置
    const distConfig = await this.configService.getDistConfig(tenantId);

    // 5. 计算佣金基数（支持多种策略）
    const commissionBaseResult = await this.baseCalculator.calculateCommissionBase(order, distConfig.commissionBaseType);
    
    if (commissionBaseResult.base.lte(0)) {
      this.logger.log(`[Commission] Order ${orderId} commission base is 0, skip (type: ${commissionBaseResult.type})`);
      return;
    }

    const commissionBase = commissionBaseResult.base;
    const baseType = commissionBaseResult.type;
    
    this.logger.log(
      `[Commission] Order ${orderId} base calculation: ` +
      `type=${baseType}, base=${commissionBase.toFixed(2)}, ` +
      `original=${order.totalAmount.toFixed(2)}, paid=${order.payAmount.toFixed(2)}`
    );

    const planSettleTime = this.calculateSettleTime(order.orderType);
    const records: CommissionRecord[] = [];

    // 提取商品信息用于查询商品级配置（OmsOrderItem 有 productId，无 categoryId 需单独查询）
    const orderItems = order.items.map((item: { skuId: string; productId: string; quantity: number; price: unknown }) => ({
      skuId: item.skuId,
      productId: item.productId || '',
      categoryId: '', // 无关联时留空，getEffectiveConfig 会回退到租户默认
      quantity: item.quantity,
      price: item.price instanceof Decimal ? item.price : new Decimal(String(item.price)),
    }));

    // 6. 计算 L1 佣金 (直接推荐: 分享人优先，否则绑定的parentId)
    const l1Result = await this.l1Calculator.calculateL1(
      order,
      member,
      distConfig,
      commissionBase,
      planSettleTime,
      orderItems,
      this.productConfigService,
    );
    if (l1Result?.record) records.push(l1Result.record);

    // 7. 计算 L2 佣金 (间接推荐: 仅当L1有上级C2时)
    //    特殊情况: 若L1本身是C2且无上级，则L1全拿(L1+L2)
    const l2Record = await this.l2Calculator.calculateL2(
      order,
      member,
      distConfig,
      commissionBase,
      planSettleTime,
      l1Result?.beneficiaryId,
      l1Result?.beneficiaryLevel,
      l1Result?.noL2Available,
      orderItems,
      this.productConfigService,
    );
    if (l2Record) records.push(l2Record);

    // 8. 熔断保护：总佣金不能超过实付金额的配置比例
    const totalCommission = records.reduce((sum, r) => sum.add(r.amount), new Decimal(0));
    const maxAllowed = order.payAmount.mul(distConfig.maxCommissionRate);
    
    if (totalCommission.gt(maxAllowed)) {
      const ratio = maxAllowed.div(totalCommission);
      this.logger.warn(
        `[Commission] Order ${orderId} commission capped: ` +
        `original=${totalCommission.toFixed(2)}, max=${maxAllowed.toFixed(2)}, ` +
        `ratio=${ratio.toFixed(4)}`
      );
      
      // 按比例缩减所有佣金
      records.forEach(record => {
        record.amount = record.amount.mul(ratio).toDecimalPlaces(2);
        record.isCapped = true;
      });
    }

    // 9. 批量持久化 (使用 upsert 防止重复计算)
    for (const record of records) {
      // 补充审计字段
      const enrichedRecord: CommissionRecord = {
        ...record,
        commissionBase,
        commissionBaseType: baseType,
        orderOriginalPrice: order.totalAmount,
        orderActualPaid: order.payAmount,
        couponDiscount: order.couponDiscount,
        pointsDiscount: order.pointsDiscount,
      };

      await this.commissionRepo.upsert({
        where: {
          orderId_beneficiaryId_level: {
            orderId: record.orderId,
            beneficiaryId: record.beneficiaryId,
            level: record.level,
          },
        },
        create: {
          orderId: enrichedRecord.orderId,
          tenantId: enrichedRecord.tenantId,
          beneficiaryId: enrichedRecord.beneficiaryId,
          level: enrichedRecord.level,
          amount: enrichedRecord.amount,
          rateSnapshot: enrichedRecord.rateSnapshot,
          status: enrichedRecord.status as any,
          planSettleTime: enrichedRecord.planSettleTime,
          isCrossTenant: enrichedRecord.isCrossTenant,
          isCapped: enrichedRecord.isCapped,
          commissionBase: enrichedRecord.commissionBase,
          commissionBaseType: enrichedRecord.commissionBaseType as any,
          orderOriginalPrice: enrichedRecord.orderOriginalPrice,
          orderActualPaid: enrichedRecord.orderActualPaid,
          couponDiscount: enrichedRecord.couponDiscount,
          pointsDiscount: enrichedRecord.pointsDiscount,
        },
        update: {}, // 若存在则忽略
      });
    }

    this.logger.log(`[Commission] Created ${records.length} records for order ${orderId}`);
  }

  /**
   * 计算结算时间
   */
  private calculateSettleTime(orderType: OrderType): Date {
    const now = new Date();

    if (orderType === OrderType.PRODUCT) {
      // 实物: T+14 (发货期7天 + 收货确认后7天)
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    } else {
      // 服务: T+1 (核销后24小时)
      return new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    }
  }
}
