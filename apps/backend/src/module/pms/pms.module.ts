import { Module } from '@nestjs/common';
import { PmsProductService } from './product.service';
import { PmsProductController } from './product.controller';
import { CategoryModule } from './category/category.module';
import { BrandModule } from './brand/brand.module';
import { AttributeController } from './attribute/attribute.controller';
import { AttributeService } from './attribute/attribute.service';

@Module({
  imports: [CategoryModule, BrandModule],
  controllers: [PmsProductController, AttributeController],
  providers: [PmsProductService, AttributeService],
})
export class PmsModule { }
