import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { StoreProductController } from './product.controller';
import { StoreProductService } from './product.service';
import { ProfitValidator } from './profit-validator';
import { TenantProductRepository } from './tenant-product.repository';
import { TenantSkuRepository } from './tenant-sku.repository';
import { ProductSyncProducer, ProductSyncConsumer, PRODUCT_SYNC_QUEUE } from './product-sync.queue';

@Module({
  imports: [BullModule.registerQueue({ name: PRODUCT_SYNC_QUEUE })],
  controllers: [StoreProductController],
  providers: [
    StoreProductService,
    ProfitValidator,
    TenantProductRepository,
    TenantSkuRepository,
    ProductSyncProducer,
    ProductSyncConsumer,
  ],
  exports: [StoreProductService, TenantProductRepository, TenantSkuRepository, ProductSyncProducer],
})
export class StoreProductModule {}
