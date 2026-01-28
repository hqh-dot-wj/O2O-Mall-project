import { Injectable, Logger } from '@nestjs/common';
import { FinWithdrawal, WithdrawalStatus, TransType } from '@prisma/client';
import { WithdrawalRepository } from './withdrawal.repository';
import { WalletRepository } from '../wallet/wallet.repository';
import { TransactionRepository } from '../wallet/transaction.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode, Result } from 'src/common/response';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { WithdrawalPaymentService } from './withdrawal-payment.service';
import { Decimal } from '@prisma/client/runtime/library';
import { WalletService } from '../wallet/wallet.service';

/**
 * 提现审核服务
 * 负责审核状态流转、资金变动及外部打款调用
 */
@Injectable()
export class WithdrawalAuditService {
    private readonly logger = new Logger(WithdrawalAuditService.name);

    constructor(
        private readonly withdrawalRepo: WithdrawalRepository,
        private readonly walletRepo: WalletRepository,
        private readonly transactionRepo: TransactionRepository,
        private readonly prisma: PrismaService,
        private readonly paymentService: WithdrawalPaymentService,
        private readonly walletService: WalletService,
    ) { }

    /**
     * 审核通过
     */
    async approve(withdrawal: FinWithdrawal, auditBy: string) {
        try {
            // 1. 外部打款 (不可回滚，因此在事务外执行)
            const { paymentNo } = await this.paymentService.transfer(withdrawal);

            // 2. 内部记账 (事务内执行)
            await this.completeApproval(withdrawal, paymentNo, auditBy);

            return Result.ok({ paymentNo }, '审核通过并打款成功');
        } catch (error: any) {
            await this.handlePaymentFailure(withdrawal.id, error.message);
            throw new BusinessException(ResponseCode.BUSINESS_ERROR, `打款失败: ${error.message}`);
        }
    }

    /**
     * 审核驳回
     */
    @Transactional()
    async reject(withdrawal: FinWithdrawal, auditBy: string, remark?: string) {
        // 1. 更新提现状态
        await this.withdrawalRepo.update(withdrawal.id, {
            status: WithdrawalStatus.REJECTED,
            auditTime: new Date(),
            auditBy,
            auditRemark: remark,
        });

        // 2. 退回余额 (解冻并加回余额)
        // 使用 WalletService 封装的方法
        await this.walletService.unfreezeBalance(withdrawal.memberId, withdrawal.amount);

        return Result.ok(null, '已驳回');
    }

    /**
     * 完成提现入账 (事务方法)
     */
    @Transactional()
    private async completeApproval(withdrawal: FinWithdrawal, paymentNo: string, auditBy: string) {
        // 1. 更新提现状态
        await this.withdrawalRepo.update(withdrawal.id, {
            status: WithdrawalStatus.APPROVED,
            auditTime: new Date(),
            auditBy,
            paymentNo,
        });

        // 2. 扣减冻结余额
        await this.walletService.deductFrozen(withdrawal.memberId, withdrawal.amount);

        // 3. 记录流水
        const wallet = await this.walletRepo.findByMemberId(withdrawal.memberId);
        if (wallet) {
            await this.transactionRepo.create({
                wallet: { connect: { id: wallet.id } },
                tenantId: withdrawal.tenantId,
                type: TransType.WITHDRAW_OUT,
                amount: new Decimal(0).minus(withdrawal.amount), // 负数
                balanceAfter: wallet.balance,
                relatedId: withdrawal.id,
                remark: '余额提现成功',
            });
        }
    }

    /**
     * 处理打款失败
     */
    @Transactional()
    private async handlePaymentFailure(withdrawalId: string, failReason: string) {
        await this.withdrawalRepo.update(withdrawalId, {
            status: WithdrawalStatus.FAILED,
            failReason,
        });
    }
}
