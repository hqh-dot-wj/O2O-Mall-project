import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { FinanceModule } from '../../finance/finance.module';
import { ClientOrderModule } from '../order/order.module';

@Module({
  imports: [FinanceModule, ClientOrderModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule { }
