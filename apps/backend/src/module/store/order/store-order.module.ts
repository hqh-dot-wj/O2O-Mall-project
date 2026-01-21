import { Module } from '@nestjs/common';
import { StoreOrderController } from './store-order.controller';
import { StoreOrderService } from './store-order.service';
import { FinanceModule } from 'src/module/finance/finance.module';

/**
 * Store端订单管理模块
 */
@Module({
    imports: [FinanceModule],
    controllers: [StoreOrderController],
    providers: [StoreOrderService],
    exports: [StoreOrderService],
})
export class StoreOrderModule { }
