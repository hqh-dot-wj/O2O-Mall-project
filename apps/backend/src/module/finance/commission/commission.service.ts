import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CommissionStatus, OrderType, ProductType } from '@prisma/client';

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
            // 返回默认配置
            return {
                level1Rate: new Decimal(0.6), // 60%
                level2Rate: new Decimal(0.4), // 40%
                enableLV0: true,
            };
        }

        return config;
    }

    /**
     * 检查是否自购 (不返佣)
     */
    checkSelfPurchase(memberId: string, shareUserId: string | null, referrerId: string | null): boolean {
        // 情况1: 订单会员 === 分享人
        if (shareUserId && memberId === shareUserId) {
            return true;
        }
        // 情况2: 订单会员 === 推荐人
        if (referrerId && memberId === referrerId) {
            return true;
        }
        return false;
    }

    /**
     * 计算佣金 (由 Processor 调用)
     */
    async calculateCommission(orderId: string, tenantId: string) {
        const order = await this.prisma.omsOrder.findUnique({
            where: { id: orderId },
            include: {
                items: true,
            },
        });

        if (!order) {
            this.logger.warn(`Order ${orderId} not found`);
            return;
        }

        // 检查自购
        if (this.checkSelfPurchase(order.memberId, order.shareUserId, order.referrerId)) {
            this.logger.log(`Order ${orderId} is self-purchase, skip commission`);
            return;
        }

        // 获取租户分销配置
        const distConfig = await this.getDistConfig(tenantId);

        // 计算佣金基数 (使用 SKU 的 distRate 或默认商品价格的比例)
        // 简化版: 使用订单支付金额 * SKU分佣比例
        const commissionBase = await this.calculateCommissionBase(order);

        if (commissionBase.lte(0)) {
            this.logger.log(`Order ${orderId} commission base is 0, skip`);
            return;
        }

        // 查询购买人的推荐链
        const member = await this.prisma.umsMember.findUnique({
            where: { memberId: order.memberId },
            include: {
                referrer: {
                    include: {
                        referrer: true, // L2
                    },
                },
            },
        });

        if (!member) {
            return;
        }

        // 计算结算时间
        const planSettleTime = this.calculateSettleTime(order.orderType);

        const records: any[] = [];

        // L1 佣金 (直推)
        // 优先使用 shareUserId (分享人), 其次是 referrerId (永久上级)
        const l1Beneficiary = order.shareUserId || member.referrerId;
        if (l1Beneficiary && l1Beneficiary !== order.memberId) {
            const l1Amount = commissionBase.mul(distConfig.level1Rate);
            if (l1Amount.gte(0.01)) { // 最小0.01元
                records.push({
                    orderId: order.id,
                    tenantId,
                    beneficiaryId: l1Beneficiary,
                    level: 1,
                    amount: l1Amount.toDecimalPlaces(2),
                    rateSnapshot: distConfig.level1Rate.mul(100),
                    status: 'FROZEN' as CommissionStatus,
                    planSettleTime,
                });
            }
        }

        // L2 佣金 (间推)
        const l2Beneficiary = member.referrer?.referrerId;
        if (l2Beneficiary && l2Beneficiary !== order.memberId && l2Beneficiary !== l1Beneficiary) {
            const l2Amount = commissionBase.mul(distConfig.level2Rate);
            if (l2Amount.gte(0.01)) {
                records.push({
                    orderId: order.id,
                    tenantId,
                    beneficiaryId: l2Beneficiary,
                    level: 2,
                    amount: l2Amount.toDecimalPlaces(2),
                    rateSnapshot: distConfig.level2Rate.mul(100),
                    status: 'FROZEN' as CommissionStatus,
                    planSettleTime,
                });
            }
        }

        // 批量插入 (使用 upsert 防重复)
        for (const record of records) {
            await this.prisma.finCommission.upsert({
                where: {
                    orderId_beneficiaryId_level: {
                        orderId: record.orderId,
                        beneficiaryId: record.beneficiaryId,
                        level: record.level,
                    },
                },
                create: record,
                update: {}, // 已存在则跳过
            });
        }

        this.logger.log(`Created ${records.length} commission records for order ${orderId}`);
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
                    totalBase = totalBase.add(
                        item.totalAmount.mul(tenantSku.distRate),
                    );
                } else if (tenantSku.distMode === 'FIXED') {
                    // 固定金额
                    totalBase = totalBase.add(
                        tenantSku.distRate.mul(item.quantity),
                    );
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

        if (orderType === 'PRODUCT') {
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
        return this.prisma.finCommission.findMany({
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
        const commissions = await this.prisma.finCommission.findMany({
            where: { orderId },
        });

        for (const comm of commissions) {
            if (comm.status === 'FROZEN') {
                // 冻结中: 直接取消
                await this.prisma.finCommission.update({
                    where: { id: comm.id },
                    data: { status: 'CANCELLED' },
                });
            } else if (comm.status === 'SETTLED') {
                // 已结算: 需要倒扣
                await this.rollbackCommission(comm);
            }
        }

        this.logger.log(`Cancelled commissions for order ${orderId}`);
    }

    /**
     * 回滚已结算佣金
     */
    private async rollbackCommission(commission: any) {
        await this.prisma.$transaction(async (tx) => {
            const wallet = await tx.finWallet.findUnique({
                where: { memberId: commission.beneficiaryId },
            });

            if (!wallet) return;

            // 扣减余额 (可能变负)
            await tx.finWallet.update({
                where: { id: wallet.id },
                data: {
                    balance: { decrement: commission.amount },
                    version: { increment: 1 },
                },
            });

            // 写入负向流水
            const updatedWallet = await tx.finWallet.findUnique({
                where: { id: wallet.id },
            });

            await tx.finTransaction.create({
                data: {
                    walletId: wallet.id,
                    tenantId: commission.tenantId,
                    type: 'REFUND_DEDUCT',
                    amount: new Decimal(0).minus(commission.amount),
                    balanceAfter: updatedWallet!.balance,
                    relatedId: commission.orderId,
                    remark: `订单退款，佣金回收`,
                },
            });

            // 更新佣金状态
            await tx.finCommission.update({
                where: { id: commission.id },
                data: { status: 'CANCELLED' },
            });
        });
    }

    /**
     * 更新计划结算时间 (订单确认收货/核销时调用)
     */
    async updatePlanSettleTime(orderId: string, eventType: 'CONFIRM' | 'VERIFY') {
        const commissions = await this.prisma.finCommission.findMany({
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
        await this.prisma.finCommission.updateMany({
            where: {
                orderId,
                status: 'FROZEN',
            },
            data: {
                planSettleTime,
            },
        });

        this.logger.log(`Updated settlement time for order ${orderId} to ${planSettleTime.toISOString()}`);
    }

    /**
     * 检查循环推荐 (绑定推荐人时调用)
     */
    async checkCircularReferral(memberId: string, referrerId: string): Promise<boolean> {
        let current = await this.prisma.umsMember.findUnique({
            where: { memberId: referrerId },
        });
        let depth = 0;

        while (current?.referrerId && depth < 10) {
            if (current.referrerId === memberId) {
                return true; // 发现循环
            }
            current = await this.prisma.umsMember.findUnique({
                where: { memberId: current.referrerId },
            });
            depth++;
        }

        return false;
    }
}
