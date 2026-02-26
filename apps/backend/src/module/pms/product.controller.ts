import { Body, Controller, Get, Post, Put, Patch, Query, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PmsProductService } from './product.service';
import { CreateProductDto, UpdateProductDto, UpdateProductStatusDto, ListProductDto } from './dto';
import { ProductVo } from './vo';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { Operlog } from 'src/module/admin/common/decorators/operlog.decorator';
import { BusinessType } from 'src/common/constant/business.constant';

/**
 * 商品管理控制器
 */
@ApiTags('商品管理')
@ApiBearerAuth('Authorization')
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
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.pmsProductService.update(id, dto);
  }

  @ApiOperation({ summary: '删除商品' })
  @RequirePermission('pms:product:delete')
  @Operlog({ businessType: BusinessType.DELETE })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.pmsProductService.remove(id);
  }

  @ApiOperation({ summary: '更新商品发布状态' })
  @RequirePermission('pms:product:update')
  @Operlog({ businessType: BusinessType.UPDATE })
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateProductStatusDto) {
    return this.pmsProductService.updateStatus(id, dto);
  }
}
