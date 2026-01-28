import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WalletService } from './wallet/wallet.service';
import { CommissionService } from './commission/commission.service';
import { CommissionProcessor } from './commission/commission.processor';
import { WithdrawalService } from './withdrawal/withdrawal.service';
import { WithdrawalAuditService } from './withdrawal/withdrawal-audit.service';
import { WithdrawalPaymentService } from './withdrawal/withdrawal-payment.service';
import { SettlementScheduler } from './settlement/settlement.scheduler';
import { WithdrawalController } from './withdrawal/withdrawal.controller';
import { WithdrawalRepository } from './withdrawal/withdrawal.repository';
import { CommissionRepository } from './commission/commission.repository';
import { WalletRepository } from './wallet/wallet.repository';
import { TransactionRepository } from './wallet/transaction.repository';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'CALC_COMMISSION',
    }),
  ],
  controllers: [WithdrawalController],
  providers: [
    WalletService,
    CommissionService,
    CommissionProcessor,
    WithdrawalService,
    WithdrawalAuditService,
    WithdrawalPaymentService,
    SettlementScheduler,
    // Repositories
    WithdrawalRepository,
    CommissionRepository,
    WalletRepository,
    TransactionRepository,
  ],
  exports: [
    WalletService,
    CommissionService,
    WithdrawalService,
    // 导出 Repositories 供其他模块使用
    WithdrawalRepository,
    CommissionRepository,
    WalletRepository,
    TransactionRepository,
  ],
})
export class FinanceModule {}
