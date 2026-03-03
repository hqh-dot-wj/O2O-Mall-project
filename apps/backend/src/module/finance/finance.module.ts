import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DistributionModule } from '../store/distribution/distribution.module';
import { WalletService } from './wallet/wallet.service';
import { WalletAdminService } from './wallet/wallet-admin.service';
import { WalletQueueService } from './wallet/wallet-queue.service';
import { WalletProcessor } from './wallet/wallet.processor';
import { CommissionService } from './commission/commission.service';
import { CommissionAdminService } from './commission/commission-admin.service';
import { CommissionProcessor } from './commission/commission.processor';
import { WithdrawalService } from './withdrawal/withdrawal.service';
import { WithdrawalAdminService } from './withdrawal/withdrawal-admin.service';
import { WithdrawalAuditService } from './withdrawal/withdrawal-audit.service';
import { WithdrawalPaymentService } from './withdrawal/withdrawal-payment.service';
import { WithdrawalReconciliationScheduler } from './withdrawal/withdrawal-reconciliation.scheduler';
import { SettlementScheduler } from './settlement/settlement.scheduler';
import { SettlementLogService } from './settlement/settlement-log.service';
import { SettlementController } from './settlement/settlement.controller';
import { WithdrawalController } from './withdrawal/withdrawal.controller';
import { WithdrawalRepository } from './withdrawal/withdrawal.repository';
import { CommissionRepository } from './commission/commission.repository';
import { WalletRepository } from './wallet/wallet.repository';
import { TransactionRepository } from './wallet/transaction.repository';
// Commission sub-services
import { DistConfigService } from './commission/services/dist-config.service';
import { CommissionValidatorService } from './commission/services/commission-validator.service';
import { BaseCalculatorService } from './commission/services/base-calculator.service';
import { L1CalculatorService } from './commission/services/l1-calculator.service';
import { L2CalculatorService } from './commission/services/l2-calculator.service';
import { CommissionCalculatorService } from './commission/services/commission-calculator.service';
import { CommissionSettlerService } from './commission/services/commission-settler.service';
// Events
import { FinanceEventsModule } from './events/finance-events.module';
import { FinanceEventEmitter } from './events/finance-event.emitter';
// Ports & Adapters (A-T1, A-T2: 跨模块解耦)
import { OrderQueryPort } from './ports/order-query.port';
import { MemberQueryPort } from './ports/member-query.port';
import { OrderQueryAdapter } from './adapters/order-query.adapter';
import { MemberQueryAdapter } from './adapters/member-query.adapter';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'CALC_COMMISSION' },
      { name: 'WALLET_OPERATIONS' }, // A-T4: 钱包操作队列
    ),
    DistributionModule,
    FinanceEventsModule,
  ],
  controllers: [WithdrawalController, SettlementController],
  providers: [
    WalletService,
    WalletAdminService,
    WalletQueueService, // A-T4
    WalletProcessor, // A-T4
    CommissionService,
    CommissionAdminService,
    CommissionProcessor,
    WithdrawalService,
    WithdrawalAdminService,
    WithdrawalAuditService,
    WithdrawalPaymentService,
    WithdrawalReconciliationScheduler,
    SettlementScheduler,
    SettlementLogService,
    // Commission sub-services
    DistConfigService,
    CommissionValidatorService,
    BaseCalculatorService,
    L1CalculatorService,
    L2CalculatorService,
    CommissionCalculatorService,
    CommissionSettlerService,
    // Repositories
    WithdrawalRepository,
    CommissionRepository,
    WalletRepository,
    TransactionRepository,
    // Ports & Adapters (A-T1, A-T2)
    { provide: OrderQueryPort, useClass: OrderQueryAdapter },
    { provide: MemberQueryPort, useClass: MemberQueryAdapter },
  ],
  exports: [
    WalletService,
    WalletAdminService,
    WalletQueueService, // A-T4
    CommissionService,
    CommissionAdminService,
    WithdrawalService,
    WithdrawalAdminService,
    SettlementScheduler,
    SettlementLogService,
    // 导出 Repositories 供其他模块使用
    WithdrawalRepository,
    CommissionRepository,
    WalletRepository,
    TransactionRepository,
    // 导出事件模块
    FinanceEventsModule,
    FinanceEventEmitter,
    // 导出 Ports 供测试使用
    OrderQueryPort,
    MemberQueryPort,
  ],
})
export class FinanceModule {}
