import { Module } from '@nestjs/common';
import { StockModule } from './stock/stock.module';
import { StoreProductModule } from './product/product.module';
import { BullModule } from '@nestjs/bull';
import { PRODUCT_SYNC_QUEUE, ProductSyncProducer, ProductSyncConsumer } from './product/product-sync.queue';

@Module({
  imports: [
    StockModule,
    StoreProductModule,
    BullModule.registerQueue({
      name: PRODUCT_SYNC_QUEUE,
    }),
  ],
  controllers: [],
  providers: [ProductSyncProducer, ProductSyncConsumer],
  exports: [],
})
export class StoreModule { }
