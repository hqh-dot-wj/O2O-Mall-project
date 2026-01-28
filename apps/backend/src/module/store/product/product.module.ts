import { Module } from '@nestjs/common';
import { StoreProductController } from './product.controller';
import { StoreProductService } from './product.service';
import { ProfitValidator } from './profit-validator';
import { TenantProductRepository } from './tenant-product.repository';
import { TenantSkuRepository } from './tenant-sku.repository';

@Module({
  controllers: [StoreProductController],
  providers: [StoreProductService, ProfitValidator, TenantProductRepository, TenantSkuRepository],
  exports: [StoreProductService, TenantProductRepository, TenantSkuRepository],
})
export class StoreProductModule {}
