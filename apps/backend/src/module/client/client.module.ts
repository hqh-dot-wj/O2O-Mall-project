import { Module, Global } from '@nestjs/common';
import { ClientAuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ClientProductModule } from './product/product.module';
import { ClientLocationModule } from './location/location.module';
import { ClientCartModule } from './cart/cart.module';
import { ClientOrderModule } from './order/order.module';
import { ClientAddressModule } from './address/address.module';
import { ServiceSlotModule } from './service/service-slot.module';
import { PaymentModule } from './payment/payment.module';
import { ClientFinanceModule } from './finance/client-finance.module';
import { UpgradeModule } from './upgrade/upgrade.module';

@Module({
  imports: [
    ClientAuthModule,
    UserModule,
    ClientProductModule,
    ClientLocationModule,
    ClientCartModule,
    ClientOrderModule,
    ClientAddressModule,
    ServiceSlotModule,
    PaymentModule,
    ClientFinanceModule,
    UpgradeModule,
  ],
  controllers: [],
  providers: [],
  exports: [
    ClientAuthModule,
    ClientProductModule,
    ClientLocationModule,
    ClientCartModule,
    ClientOrderModule,
    ClientAddressModule,
    ServiceSlotModule,
    PaymentModule,
  ],
})
export class ClientModule { }
