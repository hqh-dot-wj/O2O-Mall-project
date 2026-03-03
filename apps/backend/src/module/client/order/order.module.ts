import { Module, forwardRef } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderIntegrationController } from './order-integration.controller';
import { OrderService } from './order.service';
import { FinanceModule } from 'src/module/finance/finance.module';
import { NotificationModule } from 'src/module/notification/notification.module';
import { MarketingModule } from 'src/module/marketing/marketing.module';
import { LbsModule } from 'src/module/lbs/lbs.module';
import { BullModule } from '@nestjs/bull';
import { NotificationProcessor } from './notification.processor';
import { OrderDelayProcessor } from './order-delay.processor';
import { OrderRepository } from './order.repository';
import { CartRepository } from '../cart/cart.repository';
import { OrderCheckoutService } from './services/order-checkout.service';
import { AttributionService } from './services/attribution.service';
import { ClientAddressModule } from '../address/address.module';
import { ClientCartModule } from '../cart/cart.module';
import { ORDER_SERVICE } from './order-service.token';

/**
 * C端订单模块
 */
@Module({
  imports: [
    FinanceModule,
    NotificationModule,
    forwardRef(() => MarketingModule),
    ClientAddressModule, // For AddressRepository
    ClientCartModule, // For CartService
    LbsModule, // For AdmissionService
    BullModule.registerQueue({
      name: 'ORDER_NOTIFICATION',
    }),
    BullModule.registerQueue({
      name: 'ORDER_DELAY',
    }),
  ],
  controllers: [OrderController, OrderIntegrationController],
  providers: [
    OrderService,
    NotificationProcessor,
    OrderDelayProcessor,
    OrderRepository,
    CartRepository,
    OrderCheckoutService,
    AttributionService,
    {
      provide: ORDER_SERVICE,
      useExisting: OrderService,
    },
  ],

  exports: [OrderService, OrderRepository, ORDER_SERVICE],
})
export class ClientOrderModule {}
