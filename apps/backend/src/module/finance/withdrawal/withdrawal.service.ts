import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { Decimal } from '@prisma/client/runtime/library';
import { WithdrawalStatus } from '@prisma/client';

/**
 * 提现服务
 * 处理提现申请、审核、打款等逻辑
 */
@Injectable()
export class WithdrawalService {
    private readonly logger = new Logger(WithdrawalService.name);

    // 最小提现金额
    private readonly MIN_WITHDRAWAL_AMOUNT = 1;

    constructor(
        private readonly prisma: PrismaService,
        private readonly walletService: WalletService,
    ) { }

    /**
     * 申请提现
     */
    async apply(
        memberId: string,
        tenantId: string,
        amount: number,
        method: string,
    ) {
        const amountDecimal = new Decimal(amount);

        // 校验最小金额
        if (amountDecimal.lt(this.MIN_WITHDRAWAL_AMOUNT)) {
            throw new BadRequestException(
                `最小提现金额为 ${this.MIN_WITHDRAWAL_AMOUNT} 元`,
            );
        }

        // 获取钱包
        const wallet = await this.walletService.getWallet(memberId);
        if (!wallet) {
            throw new BadRequestException('钱包不存在');
        }

        // 校验余额
        if (wallet.balance.lt(amountDecimal)) {
            throw new BadRequestException('余额不足');
        }

        // 获取用户信息
        const member = await this.prisma.umsMember.findUnique({
            where: { memberId },
        });

        // 冻结余额并创建提现记录
        const result = await this.prisma.$transaction(async (tx) => {
            // 冻结
            await tx.finWallet.update({
                where: { memberId },
                data: {
                    balance: { decrement: amountDecimal },
                    frozen: { increment: amountDecimal },
                    version: { increment: 1 },
                },
            });

            // 创建提现记录
            const withdrawal = await tx.finWithdrawal.create({
                data: {
                    tenantId,
                    memberId,
                    amount: amountDecimal,
                    method,
                    realName: member?.nickname || '',
                    status: 'PENDING',
                },
            });

            return withdrawal;
        });

        this.logger.log(`Withdrawal application created: ${result.id}`);
        return result;
    }

    /**
     * 审核提现
     */
    async audit(
        withdrawalId: string,
        tenantId: string,
        action: 'APPROVE' | 'REJECT',
        auditBy: string,
        remark?: string,
    ) {
        // 查询提现记录 (带租户隔离)
        const withdrawal = await this.prisma.finWithdrawal.findFirst({
            where: {
                id: withdrawalId,
                tenantId,
                status: 'PENDING',
            },
            include: {
                member: true,
            },
        });

        if (!withdrawal) {
            throw new BadRequestException('提现申请不存在或已处理');
        }

        if (action === 'REJECT') {
            // 驳回: 钱退回余额
            await this.prisma.$transaction([
                this.prisma.finWithdrawal.update({
                    where: { id: withdrawalId },
                    data: {
                        status: 'REJECTED',
                        auditTime: new Date(),
                        auditBy,
                        auditRemark: remark,
                    },
                }),
                this.prisma.finWallet.update({
                    where: { memberId: withdrawal.memberId },
                    data: {
                        balance: { increment: withdrawal.amount },
                        frozen: { decrement: withdrawal.amount },
                        version: { increment: 1 },
                    },
                }),
            ]);

            this.logger.log(`Withdrawal ${withdrawalId} rejected`);
            return { success: true, message: '已驳回' };
        }

        // 通过: 调用微信打款
        try {
            const paymentResult = await this.transferToWechat(withdrawal);

            await this.prisma.$transaction(async (tx) => {
                // 更新提现状态
                await tx.finWithdrawal.update({
                    where: { id: withdrawalId },
                    data: {
                        status: 'APPROVED',
                        auditTime: new Date(),
                        auditBy,
                        paymentNo: paymentResult.paymentNo,
                    },
                });

                // 扣减冻结余额
                await tx.finWallet.update({
                    where: { memberId: withdrawal.memberId },
                    data: {
                        frozen: { decrement: withdrawal.amount },
                        version: { increment: 1 },
                    },
                });

                // 写入流水
                const wallet = await tx.finWallet.findUnique({
                    where: { memberId: withdrawal.memberId },
                });

                await tx.finTransaction.create({
                    data: {
                        walletId: wallet!.id,
                        tenantId: withdrawal.tenantId,
                        type: 'WITHDRAW_OUT',
                        amount: new Decimal(0).minus(withdrawal.amount),
                        balanceAfter: wallet!.balance,
                        relatedId: withdrawalId,
                        remark: '提现支出',
                    },
                });
            });

            this.logger.log(`Withdrawal ${withdrawalId} approved`);
            return {
                success: true,
                message: '打款成功',
                paymentNo: paymentResult.paymentNo,
            };
        } catch (error: any) {
            // 打款失败
            await this.prisma.finWithdrawal.update({
                where: { id: withdrawalId },
                data: {
                    status: 'FAILED',
                    failReason: error.message,
                },
            });

            this.logger.error(`Withdrawal ${withdrawalId} payment failed`, error);
            throw new BadRequestException(`打款失败: ${error.message}`);
        }
    }

    /**
     * 微信打款 (调用微信支付接口)
     * TODO: 对接实际微信支付 API
     */
    private async transferToWechat(withdrawal: any): Promise<{ paymentNo: string }> {
        // 这里需要对接微信支付企业付款接口
        // 目前返回模拟数据
        this.logger.log(`Transferring ${withdrawal.amount} to member ${withdrawal.memberId}`);

        // 模拟打款成功
        return {
            paymentNo: `WX${Date.now()}`,
        };
    }

    /**
     * 获取提现列表 (Store端)
     */
    async getList(
        tenantId: string,
        status?: WithdrawalStatus,
        page: number = 1,
        size: number = 20,
    ) {
        const where: any = { tenantId };
        if (status) {
            where.status = status;
        }

        const [list, total] = await Promise.all([
            this.prisma.finWithdrawal.findMany({
                where,
                include: {
                    member: {
                        select: {
                            memberId: true,
                            nickname: true,
                            mobile: true,
                            avatar: true,
                        },
                    },
                },
                orderBy: { createTime: 'desc' },
                skip: (page - 1) * size,
                take: size,
            }),
            this.prisma.finWithdrawal.count({ where }),
        ]);

        return { list, total };
    }

    /**
     * 获取用户提现记录 (C端)
     */
    async getMemberWithdrawals(memberId: string, page: number = 1, size: number = 20) {
        const [list, total] = await Promise.all([
            this.prisma.finWithdrawal.findMany({
                where: { memberId },
                orderBy: { createTime: 'desc' },
                skip: (page - 1) * size,
                take: size,
            }),
            this.prisma.finWithdrawal.count({ where: { memberId } }),
        ]);

        return { list, total };
    }
}
