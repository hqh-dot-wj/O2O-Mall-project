import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { FinanceModule } from 'src/module/finance/finance.module';

/**
 * C端订单模块
 */
@Module({
    imports: [FinanceModule],
    controllers: [OrderController],
    providers: [OrderService],
    exports: [OrderService],
})
export class ClientOrderModule { }
