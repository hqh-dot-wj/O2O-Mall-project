import { Module } from '@nestjs/common';
import { StockModule } from './stock/stock.module';
import { StoreProductModule } from './product/product.module';
import { DistributionModule } from './distribution/distribution.module';
import { StoreOrderModule } from './order/store-order.module';
import { StoreFinanceModule } from './finance/store-finance.module';

@Module({
  imports: [
    StockModule,
    StoreProductModule,
    DistributionModule,
    StoreOrderModule,
    StoreFinanceModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class StoreModule {}
