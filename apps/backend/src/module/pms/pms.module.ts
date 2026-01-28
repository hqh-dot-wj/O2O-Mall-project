import { Module } from '@nestjs/common';
import { PmsProductService } from './product.service';
import { PmsProductController } from './product.controller';
import { CategoryModule } from './category/category.module';
import { BrandModule } from './brand/brand.module';
import { AttributeController } from './attribute/attribute.controller';
import { AttributeService } from './attribute/attribute.service';
import { ProductRepository } from './product/product.repository';
import { SkuRepository } from './product/sku.repository';
import { AttributeRepository } from './attribute/attribute.repository';
import { TemplateRepository } from './attribute/template.repository';

@Module({
  imports: [CategoryModule, BrandModule],
  controllers: [PmsProductController, AttributeController],
  providers: [
    PmsProductService,
    ProductRepository,
    SkuRepository,
    AttributeService,
    AttributeRepository,
    TemplateRepository,
  ],
  exports: [PmsProductService],
})
export class PmsModule {}
