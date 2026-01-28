import { Body, Controller, Get, Post, Put, Query, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PmsProductService } from './product.service';
import { CreateProductDto, ListProductDto } from './dto';
import { ProductVo } from './vo';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { Operlog } from 'src/module/admin/common/decorators/operlog.decorator';
import { BusinessType } from 'src/common/constant/business.constant';

/**
 * 商品管理控制器
 */
@ApiTags('商品管理')
@Controller('admin/pms/product')
export class PmsProductController {
  constructor(private readonly pmsProductService: PmsProductService) {}

  @ApiOperation({ summary: '查询商品列表' })
  @RequirePermission('pms:product:list')
  @Get('list')
  async list(@Query() query: ListProductDto) {
    return this.pmsProductService.findAll(query);
  }

  @ApiOperation({ summary: '查询商品详情' })
  @RequirePermission('pms:product:query')
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.pmsProductService.findOne(id);
  }

  @ApiOperation({ summary: '创建商品' })
  @RequirePermission('pms:product:create')
  @Operlog({ businessType: BusinessType.INSERT })
  @Post()
  async create(@Body() dto: CreateProductDto) {
    return this.pmsProductService.create(dto);
  }

  @ApiOperation({ summary: '更新商品' })
  @RequirePermission('pms:product:update')
  @Operlog({ businessType: BusinessType.UPDATE })
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: CreateProductDto) {
    return this.pmsProductService.update(id, dto);
  }
}
