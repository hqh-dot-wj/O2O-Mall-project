import { Module } from '@nestjs/common';
import { StoreFinanceController } from './store-finance.controller';
import { StoreFinanceService } from './store-finance.service';
import { FinanceModule } from 'src/module/finance/finance.module';
import { StoreOrderRepository } from 'src/module/store/order/store-order.repository';
import { CommissionRepository } from 'src/module/finance/commission/commission.repository';
import { WithdrawalRepository } from 'src/module/finance/withdrawal/withdrawal.repository';
import { TransactionRepository } from 'src/module/finance/wallet/transaction.repository';

/**
 * Store端财务管理模块
 */
@Module({
  imports: [FinanceModule],
  controllers: [StoreFinanceController],
  providers: [
    StoreFinanceService,
    StoreOrderRepository,
    CommissionRepository,
    WithdrawalRepository,
    TransactionRepository,
  ],
  exports: [StoreFinanceService],
})
export class StoreFinanceModule {}
