import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { CurrentTenant } from 'src/common/tenant/tenant.decorator';
import { StoreProductService } from './product.service';
import { ImportProductDto, ListMarketProductDto, ListStoreProductDto, UpdateProductPriceDto } from './dto';
import { MarketProductVo, StoreProductVo } from './vo';

@ApiTags('店铺-商品管理')
@ApiBearerAuth('Authorization')
@Controller('store')
export class StoreProductController {
    constructor(private readonly productService: StoreProductService) { }

    @Api({ summary: '选品中心列表', type: MarketProductVo, isPager: true })
    @Post('market/list')
    getMarketList(@CurrentTenant() tenantId: string, @Body() query: ListMarketProductDto) {
        return this.productService.getMarketList(tenantId, query);
    }

    @Api({ summary: '导入商品' })
    @Post('product/import')
    importProduct(@Body() dto: ImportProductDto, @CurrentTenant() tenantId: string) {
        return this.productService.importProduct(tenantId, dto);
    }

    @Api({ summary: '店铺商品列表', type: StoreProductVo, isPager: true })
    @Post('product/list')
    findAll(@CurrentTenant() tenantId: string, @Body() query: ListStoreProductDto) {
        return this.productService.findAll(tenantId, query);
    }

    @Api({ summary: '更新商品价格' })
    @Post('product/update-price')
    updateProductPrice(@Body() dto: UpdateProductPriceDto, @CurrentTenant() tenantId: string) {
        return this.productService.updateProductPrice(tenantId, dto);
    }
}
