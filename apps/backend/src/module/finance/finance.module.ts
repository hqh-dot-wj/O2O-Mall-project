import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WalletService } from './wallet/wallet.service';
import { CommissionService } from './commission/commission.service';
import { CommissionProcessor } from './commission/commission.processor';
import { WithdrawalService } from './withdrawal/withdrawal.service';
import { SettlementScheduler } from './settlement/settlement.scheduler';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'CALC_COMMISSION',
    }),
  ],
  providers: [
    WalletService,
    CommissionService,
    CommissionProcessor,
    WithdrawalService,
    SettlementScheduler,
  ],
  exports: [WalletService, CommissionService, WithdrawalService],
})
export class FinanceModule {}
