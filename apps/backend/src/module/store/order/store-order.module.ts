import { Module } from '@nestjs/common';
import { StoreOrderController } from './store-order.controller';
import { StoreOrderService } from './store-order.service';
import { FinanceModule } from 'src/module/finance/finance.module';
import { StoreOrderRepository } from './store-order.repository';
import { MarketingModule } from 'src/module/marketing/marketing.module';
import { PaymentModule } from 'src/module/payment/payment.module';

/**
 * Store端订单管理模块
 */
@Module({
  imports: [FinanceModule, MarketingModule, PaymentModule],
  controllers: [StoreOrderController],
  providers: [StoreOrderService, StoreOrderRepository],
  exports: [StoreOrderService],
})
export class StoreOrderModule {}
