import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CommissionStatus, OrderType, ProductType, Prisma, TransType } from '@prisma/client';
import { CommissionRepository } from './commission.repository';
import { WalletRepository } from '../wallet/wallet.repository';
import { TransactionRepository } from '../wallet/transaction.repository';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { BusinessException } from 'src/common/exceptions';
import { BusinessConstants } from 'src/common/constants/business.constants';

/**
 * 佣金服务
 * 处理佣金计算、查询、取消等核心逻辑
 *
 * 分佣规则: order.tenantId → SysDistConfig.tenantId → level1Rate/level2Rate
 * 自购检测: order.memberId === order.shareUserId → 不返佣
 */
@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionRepo: CommissionRepository,
    private readonly walletRepo: WalletRepository,
    private readonly transactionRepo: TransactionRepository,
    @InjectQueue('CALC_COMMISSION') private readonly commissionQueue: Queue,
  ) { }

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
   */
  async getDistConfig(tenantId: string) {
    const config = await this.prisma.sysDistConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      // 返回默认配置（含跨店配置）
      return {
        level1Rate: new Decimal(BusinessConstants.DISTRIBUTION.DEFAULT_LEVEL1_RATE),
        level2Rate: new Decimal(BusinessConstants.DISTRIBUTION.DEFAULT_LEVEL2_RATE),
        enableLV0: true,
        enableCrossTenant: false, // 默认不开启跨店
        crossTenantRate: new Decimal(BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_TENANT_RATE),
        crossMaxDaily: new Decimal(BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_DAILY_LIMIT),
      };
    }

    return {
      ...config,
      // 确保新字段有默认值（兼容旧数据）
      enableCrossTenant: config.enableCrossTenant ?? false,
      crossTenantRate: config.crossTenantRate ?? new Decimal(BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_TENANT_RATE),
      crossMaxDaily: config.crossMaxDaily ?? new Decimal(BusinessConstants.DISTRIBUTION.DEFAULT_CROSS_DAILY_LIMIT),
    };
  }

  /**
   * 检查是否自购 (不返佣)
   */
  checkSelfPurchase(memberId: string, shareUserId: string | null, parentId: string | null): boolean {
    // 情况1: 订单会员 === 分享人
    if (shareUserId && memberId === shareUserId) {
      return true;
    }
    // 情况2: 订单会员 === 上级 (绑定关系)
    if (parentId && memberId === parentId) {
      return true;
    }
    return false;
  }

  /**
   * 计算佣金 (由 Processor 调用)
   *
   * @description
   * 采用 @Transactional 保证数据一致性
   * 1. 验证订单有效性及自购情形
   * 2. 计算佣金基数
   * 3. 计算并生成 L1/L2 佣金记录
   */
  @Transactional()
  async calculateCommission(orderId: string, tenantId: string) {
    // 1. 获取订单详情
    const order = await this.prisma.omsOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      this.logger.warn(`[Commission] Order ${orderId} not found`);
      return;
    }

    // 2. 获取下单人及其推荐关系链 (使用新的 parentId/indirectParentId)
    const member = await this.prisma.umsMember.findUnique({
      where: { memberId: order.memberId },
      select: {
        memberId: true,
        parentId: true,
        indirectParentId: true,
        levelId: true,
      },
    });

    if (!member) return;

    // 3. 自购检测 (自购不返佣)
    if (this.checkSelfPurchase(order.memberId, order.shareUserId, member.parentId)) {
      this.logger.log(`[Commission] Order ${orderId} is self-purchase, skip`);
      return;
    }

    // 4. 计算佣金基数
    const commissionBase = await this.calculateCommissionBase(order);
    if (commissionBase.lte(0)) {
      this.logger.log(`[Commission] Order ${orderId} commission base is 0, skip`);
      return;
    }

    // 5. 获取分销配置
    const distConfig = await this.getDistConfig(tenantId);
    const planSettleTime = this.calculateSettleTime(order.orderType);
    const records: any[] = [];

    // 6. 计算 L1 佣金 (直接推荐: 分享人优先，否则绑定的parentId)
    const l1Result = await this.calculateL1(order, member, distConfig, commissionBase, planSettleTime);
    if (l1Result?.record) records.push(l1Result.record);

    // 7. 计算 L2 佣金 (间接推荐: 仅当L1有上级C2时)
    //    特殊情况: 若L1本身是C2且无上级，则L1全拿(L1+L2)
    const l2Record = await this.calculateL2(
      order,
      member,
      distConfig,
      commissionBase,
      planSettleTime,
      l1Result?.beneficiaryId,
      l1Result?.beneficiaryLevel,
      l1Result?.noL2Available,
    );
    if (l2Record) records.push(l2Record);

    // 8. 批量持久化 (使用 upsert 防止重复计算)
    for (const record of records) {
      await this.commissionRepo.upsert({
        where: {
          orderId_beneficiaryId_level: {
            orderId: record.orderId,
            beneficiaryId: record.beneficiaryId,
            level: record.level,
          },
        },
        create: record,
        update: {}, // 若存在则忽略
      });
    }

    this.logger.log(`[Commission] Created ${records.length} records for order ${orderId}`);
  }

  /**
   * 计算 L1 佣金 (直推)
   * 规则:
   * - 优先: order.shareUserId (临时分享)
   * - 其次: member.parentId (绑定关系)
   * - 受益人必须 levelId >= 1 (C1/C2)
   *
   * @returns { record, beneficiaryId, beneficiaryLevel, noL2Available }
   */
  private async calculateL1(
    order: any,
    member: any,
    config: any,
    baseWait: Decimal,
    planSettleTime: Date,
  ): Promise<{ record: any; beneficiaryId: string; beneficiaryLevel: number; noL2Available: boolean } | null> {
    // 优先归属分享人，其次绑定的上级
    const beneficiaryId = order.shareUserId || member.parentId;

    // 1. 基础校验：无受益人或受益人为下单人本人
    if (!beneficiaryId || beneficiaryId === order.memberId) return null;

    // 2. 黑名单校验
    if (await this.isUserBlacklisted(order.tenantId, beneficiaryId)) {
      this.logger.log(`[Commission] L1 user ${beneficiaryId} is blacklisted`);
      return null;
    }

    // 3. 获取受益人信息 (需要 levelId 和 parentId)
    const beneficiary = await this.prisma.umsMember.findUnique({
      where: { memberId: beneficiaryId },
      select: { tenantId: true, levelId: true, parentId: true },
    });

    // 4. 身份校验：只有 C1(levelId=1) 或 C2(levelId=2) 才能获得分佣
    if (!beneficiary || beneficiary.levelId < 1) {
      this.logger.log(`[Commission] L1 user ${beneficiaryId} is not C1/C2, skip`);
      return null;
    }

    // 5. 跨店校验
    const isCrossTenant = beneficiary.tenantId !== order.tenantId;
    if (isCrossTenant && !config.enableCrossTenant) {
      this.logger.log(`[Commission] Cross-tenant disabled, skip L1 for ${beneficiaryId}`);
      return null;
    }

    // 6. 判断是否有 L2 受益人 (C2全拿场景)
    //    - 如果L1是C2且无上级 → L2没人拿 → L1全拿
    //    - 如果L1是C1且有上级C2 → L2给C2
    const hasL2 = beneficiary.parentId != null;
    const isC2 = beneficiary.levelId === 2;
    const noL2Available = isC2 && !hasL2; // C2直推场景，L2无人

    // 7. 计算金额与费率
    let rate = new Decimal(config.level1Rate);
    if (isCrossTenant && config.crossTenantRate) {
      rate = rate.mul(config.crossTenantRate);
    }

    // C2全拿场景: L1金额 = L1 + L2
    let amount = baseWait.mul(rate);
    if (noL2Available) {
      const l2Rate = new Decimal(config.level2Rate);
      const l2Amount = baseWait.mul(l2Rate);
      amount = amount.add(l2Amount);
      this.logger.log(`[Commission] C2 ${beneficiaryId} full take: L1+L2`);
    }

    if (amount.lt(0.01)) return null;

    // 8. 跨店限额校验
    if (isCrossTenant && config.crossMaxDaily) {
      const pass = await this.checkDailyLimit(order.tenantId, beneficiaryId, amount, config.crossMaxDaily);
      if (!pass) {
        this.logger.log(`[Commission] Daily limit exceeded for L1 ${beneficiaryId}`);
        return null;
      }
    }

    const record = {
      orderId: order.id,
      tenantId: order.tenantId,
      beneficiaryId,
      level: 1,
      amount: amount.toDecimalPlaces(2),
      rateSnapshot: rate.mul(100),
      status: 'FROZEN' as CommissionStatus,
      planSettleTime,
      isCrossTenant: !!isCrossTenant,
    };

    return {
      record,
      beneficiaryId,
      beneficiaryLevel: beneficiary.levelId,
      noL2Available,
    };
  }

  /**
   * 计算 L2 佣金 (间推)
   * 规则:
   * - 若L1是C1: L2 = L1的上级 (C2)
   * - 若L1是C2且无上级: L1已全拿，L2跳过
   * - 若是临时分享: L2 = 分享人的上级
   */
  private async calculateL2(
    order: any,
    member: any,
    config: any,
    baseWait: Decimal,
    planSettleTime: Date,
    l1BeneficiaryId?: string,
    l1BeneficiaryLevel?: number,
    noL2Available?: boolean,
  ) {
    // C2全拿场景，L2跳过
    if (noL2Available) {
      this.logger.log(`[Commission] L2 skipped: C2 full take scenario`);
      return null;
    }

    // 确定 L2 受益人
    // 1. 若有临时分享，查分享人的上级
    // 2. 否则查绑定的 indirectParentId
    let beneficiaryId: string | null = null;

    if (order.shareUserId && l1BeneficiaryId) {
      // 临时分享场景：查分享人的上级
      const sharer = await this.prisma.umsMember.findUnique({
        where: { memberId: l1BeneficiaryId },
        select: { parentId: true },
      });
      beneficiaryId = sharer?.parentId || null;
    } else {
      // 绑定关系场景：使用 indirectParentId
      beneficiaryId = member.indirectParentId;
    }

    // 1. 基础校验
    if (
      !beneficiaryId ||
      beneficiaryId === order.memberId ||
      beneficiaryId === l1BeneficiaryId || // 避免与L1重复
      beneficiaryId === order.shareUserId // 避免分享人下级获利
    )
      return null;

    // 2. 黑名单校验
    if (await this.isUserBlacklisted(order.tenantId, beneficiaryId)) {
      this.logger.log(`[Commission] L2 user ${beneficiaryId} is blacklisted`);
      return null;
    }

    // 3. 获取受益人信息并校验身份 (必须是C2)
    const beneficiary = await this.prisma.umsMember.findUnique({
      where: { memberId: beneficiaryId },
      select: { tenantId: true, levelId: true },
    });

    if (!beneficiary || beneficiary.levelId !== 2) {
      this.logger.log(`[Commission] L2 user ${beneficiaryId} is not C2, skip`);
      return null;
    }

    // 4. 跨店校验
    const isCrossTenant = beneficiary.tenantId !== order.tenantId;
    if (isCrossTenant && !config.enableCrossTenant) {
      return null;
    }

    // 5. 计算金额
    let rate = new Decimal(config.level2Rate);
    if (isCrossTenant && config.crossTenantRate) {
      rate = rate.mul(config.crossTenantRate);
    }

    const amount = baseWait.mul(rate);
    if (amount.lt(0.01)) return null;

    // 6. 限额校验
    if (isCrossTenant && config.crossMaxDaily) {
      const pass = await this.checkDailyLimit(order.tenantId, beneficiaryId, amount, config.crossMaxDaily);
      if (!pass) return null;
    }

    return {
      orderId: order.id,
      tenantId: order.tenantId,
      beneficiaryId,
      level: 2,
      amount: amount.toDecimalPlaces(2),
      rateSnapshot: rate.mul(100),
      status: 'FROZEN' as CommissionStatus,
      planSettleTime,
      isCrossTenant: !!isCrossTenant,
    };
  }

  /**
   * 计算佣金基数
   * 从订单商品的 SKU 分佣配置计算
   */
  private async calculateCommissionBase(order: any): Promise<Decimal> {
    let totalBase = new Decimal(0);

    for (const item of order.items) {
      // 查询 SKU 的分佣配置
      const tenantSku = await this.prisma.pmsTenantSku.findUnique({
        where: {
          id: item.skuId,
        },
        include: {
          globalSku: true,
        },
      });

      if (tenantSku && tenantSku.distMode !== 'NONE') {
        if (tenantSku.distMode === 'RATIO') {
          // 按比例
          totalBase = totalBase.add(item.totalAmount.mul(tenantSku.distRate));
        } else if (tenantSku.distMode === 'FIXED') {
          // 固定金额
          totalBase = totalBase.add(tenantSku.distRate.mul(item.quantity));
        }
      }
    }

    return totalBase;
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

  /**
   * 查询订单佣金列表
   */
  async getCommissionsByOrder(orderId: string) {
    return this.commissionRepo.findMany({
      where: { orderId },
      include: {
        beneficiary: {
          select: {
            memberId: true,
            nickname: true,
            avatar: true,
            mobile: true,
          },
        },
      },
    });
  }

  /**
   * 取消订单佣金 (退款时调用)
   */
  async cancelCommissions(orderId: string) {
    const commissions = await this.commissionRepo.findMany({ where: { orderId } });

    for (const comm of commissions) {
      if (comm.status === CommissionStatus.FROZEN) {
        // 冻结中: 直接取消
        await this.commissionRepo.update(comm.id, { status: CommissionStatus.CANCELLED });
      } else if (comm.status === CommissionStatus.SETTLED) {
        // 已结算: 需要倒扣
        await this.rollbackCommission(comm);
      }
    }

    this.logger.log(`Cancelled commissions for order ${orderId}`);
  }

  /**
   * 回滚已结算佣金
   */
  @Transactional()
  private async rollbackCommission(commission: any) {
    const wallet = await this.walletRepo.findOne({
      memberId: commission.beneficiaryId,
    });

    if (!wallet) return;

    // 扣减余额 (可能变负)
    await this.walletRepo.update(wallet.id, {
      balance: { decrement: commission.amount },
      version: { increment: 1 },
    });

    // 写入负向流水
    const updatedWallet = await this.walletRepo.findById(wallet.id);

    await this.transactionRepo.create({
      wallet: { connect: { id: wallet.id } },
      tenantId: commission.tenantId,
      type: TransType.REFUND_DEDUCT,
      amount: new Decimal(0).minus(commission.amount),
      balanceAfter: updatedWallet!.balance,
      relatedId: commission.orderId,
      remark: `订单退款，佣金回收`,
    });

    // 更新佣金状态
    await this.commissionRepo.update(commission.id, { status: CommissionStatus.CANCELLED });
  }

  /**
   * 更新计划结算时间 (订单确认收货/核销时调用)
   */
  async updatePlanSettleTime(orderId: string, eventType: 'CONFIRM' | 'VERIFY') {
    const commissions = await this.commissionRepo.findMany({
      where: {
        orderId,
        status: 'FROZEN',
      },
    });

    if (commissions.length === 0) return;

    const now = new Date();
    let planSettleTime: Date;

    if (eventType === 'VERIFY') {
      // 服务核销: T+1 (24小时后)
      planSettleTime = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    } else {
      // 实物确认收货: T+7 (7天后)
      planSettleTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // 批量更新
    await this.commissionRepo.updateMany(
      {
        orderId,
        status: CommissionStatus.FROZEN,
      },
      {
        planSettleTime,
      },
    );

    this.logger.log(`Updated settlement time for order ${orderId} to ${planSettleTime.toISOString()}`);
  }

  /**
   * 检查循环推荐 (绑定推荐人时调用)
   */
  async checkCircularReferral(memberId: string, parentId: string): Promise<boolean> {
    let current = await this.prisma.umsMember.findUnique({
      where: { memberId: parentId },
    });
    let depth = 0;

    while (current?.parentId && depth < 10) {
      if (current.parentId === memberId) {
        return true; // 发现循环
      }
      current = await this.prisma.umsMember.findUnique({
        where: { memberId: current.parentId },
      });
      depth++;
    }

    return false;
  }

  /**
   * 检查用户是否在黑名单中
   */
  private async isUserBlacklisted(tenantId: string, userId: string): Promise<boolean> {
    const entry = await this.prisma.sysDistBlacklist.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
    });
    return !!entry;
  }

  /**
   * 检查跨店佣金日限额
   */
  private async checkDailyLimit(
    tenantId: string,
    beneficiaryId: string,
    amount: Decimal,
    limit: Decimal,
  ): Promise<boolean> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const aggregate = await this.commissionRepo.aggregate({
      where: {
        tenantId,
        beneficiaryId,
        isCrossTenant: true,
        createTime: {
          gte: startOfDay,
        },
        status: {
          not: CommissionStatus.CANCELLED,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const currentTotal = aggregate._sum.amount ? new Decimal(aggregate._sum.amount) : new Decimal(0);
    return currentTotal.add(amount).lte(limit);
  }
}
