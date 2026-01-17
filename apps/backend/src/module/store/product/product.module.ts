import { Module } from '@nestjs/common';
import { StoreProductController } from './product.controller';
import { StoreProductService } from './product.service';

@Module({
    controllers: [StoreProductController],
    providers: [StoreProductService],
    exports: [StoreProductService],
})
export class StoreProductModule { }
