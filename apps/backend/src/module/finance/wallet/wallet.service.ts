import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 钱包服务
 * 管理用户钱包的余额、冻结、解冻等操作
 */
@Injectable()
export class WalletService {
    private readonly logger = new Logger(WalletService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * 获取或创建用户钱包
     */
    async getOrCreateWallet(memberId: string, tenantId: string) {
        let wallet = await this.prisma.finWallet.findUnique({
            where: { memberId },
        });

        if (!wallet) {
            wallet = await this.prisma.finWallet.create({
                data: {
                    memberId,
                    tenantId,
                    balance: 0,
                    frozen: 0,
                    totalIncome: 0,
                },
            });
            this.logger.log(`Created wallet for member ${memberId}`);
        }

        return wallet;
    }

    /**
     * 获取钱包信息
     */
    async getWallet(memberId: string) {
        return this.prisma.finWallet.findUnique({
            where: { memberId },
        });
    }

    /**
     * 增加可用余额 (事务内使用)
     * @param walletId 钱包ID
     * @param amount 金额
     * @param relatedId 关联业务ID
     * @param remark 备注
     * @param tx Prisma事务客户端
     */
    async addBalance(
        walletId: string,
        amount: Decimal,
        relatedId: string,
        remark: string,
        tx: any,
    ) {
        // 使用乐观锁更新余额
        const wallet = await tx.finWallet.update({
            where: { id: walletId },
            data: {
                balance: { increment: amount },
                totalIncome: { increment: amount },
                version: { increment: 1 },
            },
        });

        // 写入流水
        await tx.finTransaction.create({
            data: {
                walletId,
                tenantId: wallet.tenantId,
                type: 'COMMISSION_IN',
                amount,
                balanceAfter: wallet.balance,
                relatedId,
                remark,
            },
        });

        return wallet;
    }

    /**
     * 扣减可用余额 (事务内使用)
     */
    async deductBalance(
        walletId: string,
        amount: Decimal,
        relatedId: string,
        remark: string,
        type: 'WITHDRAW_OUT' | 'REFUND_DEDUCT' | 'CONSUME_PAY',
        tx: any,
    ) {
        const wallet = await tx.finWallet.update({
            where: { id: walletId },
            data: {
                balance: { decrement: amount },
                version: { increment: 1 },
            },
        });

        await tx.finTransaction.create({
            data: {
                walletId,
                tenantId: wallet.tenantId,
                type,
                amount: new Decimal(0).minus(amount), // 负数
                balanceAfter: wallet.balance,
                relatedId,
                remark,
            },
        });

        return wallet;
    }

    /**
     * 冻结余额 (申请提现时)
     */
    async freezeBalance(memberId: string, amount: Decimal) {
        return this.prisma.finWallet.update({
            where: { memberId },
            data: {
                balance: { decrement: amount },
                frozen: { increment: amount },
                version: { increment: 1 },
            },
        });
    }

    /**
     * 解冻余额 (提现驳回时退回)
     */
    async unfreezeBalance(memberId: string, amount: Decimal) {
        return this.prisma.finWallet.update({
            where: { memberId },
            data: {
                balance: { increment: amount },
                frozen: { decrement: amount },
                version: { increment: 1 },
            },
        });
    }

    /**
     * 扣减冻结余额 (提现成功时)
     */
    async deductFrozen(memberId: string, amount: Decimal) {
        return this.prisma.finWallet.update({
            where: { memberId },
            data: {
                frozen: { decrement: amount },
                version: { increment: 1 },
            },
        });
    }

    /**
     * 获取用户流水列表
     */
    async getTransactions(
        memberId: string,
        page: number = 1,
        size: number = 20,
    ) {
        const wallet = await this.getWallet(memberId);
        if (!wallet) {
            return { list: [], total: 0 };
        }

        const [list, total] = await Promise.all([
            this.prisma.finTransaction.findMany({
                where: { walletId: wallet.id },
                orderBy: { createTime: 'desc' },
                skip: (page - 1) * size,
                take: size,
            }),
            this.prisma.finTransaction.count({
                where: { walletId: wallet.id },
            }),
        ]);

        return { list, total };
    }
}
