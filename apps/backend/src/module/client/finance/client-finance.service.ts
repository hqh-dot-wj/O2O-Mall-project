import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result } from 'src/common/response';
import { WalletService } from 'src/module/finance/wallet/wallet.service';
import { WithdrawalService } from 'src/module/finance/withdrawal/withdrawal.service';
import { CommissionService } from 'src/module/finance/commission/commission.service';
import { ApplyWithdrawalDto, ListCommissionDto, ListTransactionDto, ListWithdrawalDto, WalletVo } from './dto/client-finance.dto';
import { FormatDateFields } from 'src/common/utils';

@Injectable()
export class ClientFinanceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly walletService: WalletService,
        private readonly withdrawalService: WithdrawalService,
        private readonly commissionService: CommissionService,
    ) { }

    /**
     * 获取我的钱包信息
     */
    async getWallet(tenantId: string, memberId: string) {
        // 确保钱包存在
        let wallet = await this.prisma.finWallet.findUnique({
            where: { memberId },
        });

        if (!wallet) {
            // 懒加载创建钱包
            wallet = await this.prisma.finWallet.create({
                data: {
                    memberId,
                    tenantId,
                    balance: 0,
                    frozen: 0,
                    totalIncome: 0,
                },
            });
        }

        const vo: WalletVo = {
            totalAssets: Number(wallet.balance) + Number(wallet.frozen),
            balance: Number(wallet.balance),
            frozen: Number(wallet.frozen),
            totalIncome: Number(wallet.totalIncome),
        };

        return Result.ok(vo);
    }

    /**
     * 申请提现
     */
    async applyWithdrawal(tenantId: string, memberId: string, dto: ApplyWithdrawalDto) {
        await this.withdrawalService.apply(memberId, tenantId, dto.amount, dto.method);
        return Result.ok(null, '申请已提交，请等待审核');
    }

    /**
     * 提现记录列表
     */
    async getWithdrawalList(tenantId: string, memberId: string, query: ListWithdrawalDto) {
        const where: any = {
            tenantId,
            memberId,
        };

        if (query.status) {
            where.status = query.status;
        }

        const [list, total] = await this.prisma.$transaction([
            this.prisma.finWithdrawal.findMany({
                where,
                skip: query.skip,
                take: query.take,
                orderBy: { createTime: 'desc' },
            }),
            this.prisma.finWithdrawal.count({ where }),
        ]);

        return Result.page(FormatDateFields(list), total);
    }

    /**
     * 佣金记录列表
     */
    async getCommissionList(tenantId: string, memberId: string, query: ListCommissionDto) {
        const where: any = {
            tenantId,
            beneficiaryId: memberId,
        };

        if (query.status) {
            where.status = query.status;
        }

        const [list, total] = await this.prisma.$transaction([
            this.prisma.finCommission.findMany({
                where,
                skip: query.skip,
                take: query.take,
                orderBy: { createTime: 'desc' },
                include: {
                    order: {
                        select: { orderSn: true, payAmount: true },
                    },
                },
            }),
            this.prisma.finCommission.count({ where }),
        ]);

        return Result.page(FormatDateFields(list), total);
    }

    /**
     * 资金流水列表
     */
    async getTransactionList(tenantId: string, memberId: string, query: ListTransactionDto) {
        // 先获取钱包ID
        const wallet = await this.prisma.finWallet.findUnique({
            where: { memberId },
        });

        if (!wallet) {
            return Result.page([], 0);
        }

        const where: any = {
            tenantId,
            walletId: wallet.id,
        };

        if (query.type) {
            where.type = query.type;
        }

        const [list, total] = await this.prisma.$transaction([
            this.prisma.finTransaction.findMany({
                where,
                skip: query.skip,
                take: query.take,
                orderBy: { createTime: 'desc' },
            }),
            this.prisma.finTransaction.count({ where }),
        ]);

        return Result.page(FormatDateFields(list), total);
    }
}
