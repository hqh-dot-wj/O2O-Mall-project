import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { StoreProductController } from './product.controller';
import { StoreProductService } from './product.service';
import { StockAlertService } from './stock-alert.service';
import { StockAlertScheduler } from './stock-alert.scheduler';
import { ProfitValidator } from './profit-validator';
import { TenantProductRepository } from './tenant-product.repository';
import { TenantSkuRepository } from './tenant-sku.repository';
import { ProductSyncProducer, ProductSyncConsumer, PRODUCT_SYNC_QUEUE } from './product-sync.queue';
import { NotificationModule } from 'src/module/notification/notification.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: PRODUCT_SYNC_QUEUE }),
    ScheduleModule.forRoot(),
    NotificationModule,
  ],
  controllers: [StoreProductController],
  providers: [
    StoreProductService,
    StockAlertService,
    StockAlertScheduler,
    ProfitValidator,
    TenantProductRepository,
    TenantSkuRepository,
    ProductSyncProducer,
    ProductSyncConsumer,
  ],
  exports: [StoreProductService, TenantProductRepository, TenantSkuRepository, ProductSyncProducer],
})
export class StoreProductModule {}
