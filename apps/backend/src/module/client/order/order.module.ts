import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { FinanceModule } from 'src/module/finance/finance.module';
import { MessageModule } from 'src/module/admin/system/message/message.module';
import { MarketingModule } from 'src/module/marketing/marketing.module';
import { BullModule } from '@nestjs/bull';
import { NotificationProcessor } from './notification.processor';
import { OrderDelayProcessor } from './order-delay.processor';

/**
 * C端订单模块
 */
@Module({
  imports: [
    FinanceModule,
    MessageModule,
    MarketingModule,
    BullModule.registerQueue({
      name: 'ORDER_NOTIFICATION',
    }),
    BullModule.registerQueue({
      name: 'ORDER_DELAY',
    }),
  ],
  controllers: [OrderController],
  providers: [OrderService, NotificationProcessor, OrderDelayProcessor],

  exports: [OrderService],
})
export class ClientOrderModule {}
