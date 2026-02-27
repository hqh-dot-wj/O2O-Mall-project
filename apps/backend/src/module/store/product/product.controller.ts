import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { CurrentTenant } from 'src/common/tenant/tenant.decorator';
import { StoreProductService } from './product.service';
import { StockAlertService } from './stock-alert.service';
import {
  BatchImportProductDto,
  BatchUpdateProductPriceDto,
  ImportProductDto,
  ListMarketProductDto,
  ListStoreProductDto,
  RemoveProductDto,
  StockAlertConfigDto,
  UpdateProductBaseDto,
  UpdateProductPriceDto,
} from './dto';
import { MarketProductVo, StoreProductVo, MarketProductDetailVo } from './vo';

@ApiTags('店铺-商品管理')
@ApiBearerAuth('Authorization')
@Controller('store')
export class StoreProductController {
  constructor(
    private readonly productService: StoreProductService,
    private readonly stockAlertService: StockAlertService,
  ) {}

  @Api({ summary: '选品中心列表', type: MarketProductVo, isPager: true })
  @RequirePermission('store:product:list')
  @Post('market/list')
  getMarketList(@CurrentTenant() tenantId: string, @Body() query: ListMarketProductDto) {
    return this.productService.getMarketList(tenantId, query);
  }

  @Api({ summary: '选品中心-商品详情', type: MarketProductDetailVo })
  @RequirePermission('store:product:query')
  @Get('market/detail/:productId')
  getMarketDetail(@CurrentTenant() tenantId: string, @Param('productId') productId: string) {
    return this.productService.getMarketDetail(tenantId, productId);
  }

  @Api({ summary: '导入商品' })
  @RequirePermission('store:product:import')
  @Post('product/import')
  importProduct(@Body() dto: ImportProductDto, @CurrentTenant() tenantId: string) {
    return this.productService.importProduct(tenantId, dto);
  }

  @Api({ summary: '批量导入商品' })
  @RequirePermission('store:product:import')
  @Post('product/import/batch')
  batchImportProducts(@Body() dto: BatchImportProductDto, @CurrentTenant() tenantId: string) {
    return this.productService.batchImportProducts(tenantId, dto);
  }

  @Api({ summary: '店铺商品列表', type: StoreProductVo, isPager: true })
  @RequirePermission('store:product:list')
  @Post('product/list')
  findAll(@CurrentTenant() tenantId: string, @Body() query: ListStoreProductDto) {
    return this.productService.findAll(tenantId, query);
  }

  @Api({ summary: '更新商品价格' })
  @RequirePermission('store:product:update')
  @Post('product/update-price')
  updateProductPrice(@Body() dto: UpdateProductPriceDto, @CurrentTenant() tenantId: string) {
    return this.productService.updateProductPrice(tenantId, dto);
  }

  @Api({ summary: '批量调价' })
  @RequirePermission('store:product:update')
  @Post('product/update-price/batch')
  batchUpdateProductPrice(@Body() dto: BatchUpdateProductPriceDto, @CurrentTenant() tenantId: string) {
    return this.productService.batchUpdateProductPrice(tenantId, dto);
  }

  @Api({ summary: '更新商品基础信息' })
  @RequirePermission('store:product:update')
  @Post('product/update-base')
  updateProductBase(@Body() dto: UpdateProductBaseDto, @CurrentTenant() tenantId: string) {
    return this.productService.updateProductBase(tenantId, dto);
  }

  @Api({ summary: '移除店铺商品' })
  @RequirePermission('store:product:update')
  @Post('product/remove')
  removeProduct(@Body() dto: RemoveProductDto, @CurrentTenant() tenantId: string) {
    return this.productService.removeProduct(tenantId, dto);
  }

  @Api({ summary: '获取库存预警阈值' })
  @RequirePermission('store:product:query')
  @Get('product/stock-alert/config')
  getStockAlertConfig(@CurrentTenant() tenantId: string) {
    return this.stockAlertService.getThreshold(tenantId);
  }

  @Api({ summary: '设置库存预警阈值' })
  @RequirePermission('store:product:update')
  @Post('product/stock-alert/config')
  setStockAlertConfig(@Body() dto: StockAlertConfigDto, @CurrentTenant() tenantId: string) {
    return this.stockAlertService.setThreshold(tenantId, dto);
  }
}
