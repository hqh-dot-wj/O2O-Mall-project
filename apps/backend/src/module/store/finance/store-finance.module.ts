import { Module } from '@nestjs/common';
import { StoreFinanceController } from './store-finance.controller';
import { StoreFinanceService } from './store-finance.service';
import { StoreDashboardService } from './dashboard.service';
import { StoreCommissionQueryService } from './commission-query.service';
import { StoreLedgerService } from './ledger.service';
import { FinanceModule } from 'src/module/finance/finance.module';
import { StoreOrderRepository } from 'src/module/store/order/store-order.repository';

/**
 * Store端财务管理模块
 * 
 * @description
 * 采用 Facade 模式拆分服务:
 * - StoreDashboardService: 看板统计
 * - StoreCommissionQueryService: 佣金查询
 * - StoreLedgerService: 财务流水
 * - StoreFinanceService: Facade 入口
 */
@Module({
  imports: [FinanceModule],
  controllers: [StoreFinanceController],
  providers: [
    StoreFinanceService,
    StoreDashboardService,
    StoreCommissionQueryService,
    StoreLedgerService,
    StoreOrderRepository,
  ],
  exports: [StoreFinanceService],
})
export class StoreFinanceModule {}
