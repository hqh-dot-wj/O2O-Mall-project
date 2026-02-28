import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BrandService } from './brand.service';
import { CreateBrandDto, UpdateBrandDto, ListBrandDto } from './dto';
import { BrandVo } from './vo';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { Operlog } from 'src/module/admin/common/decorators/operlog.decorator';
import { BusinessType } from 'src/common/constant/business.constant';
import { Api } from 'src/common/decorators/api.decorator';

/**
 * 品牌管理控制器
 */
@ApiTags('品牌管理')
@ApiBearerAuth('Authorization')
@Controller('admin/pms/brand')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @ApiOperation({ summary: '查询品牌列表' })
  @Api({ summary: '查询品牌列表', type: BrandVo, isArray: true })
  @RequirePermission('pms:brand:list')
  @Get('list')
  async list(@Query() query: ListBrandDto) {
    return this.brandService.findAll(query);
  }

  @ApiOperation({ summary: '查询品牌详情' })
  @Api({ summary: '查询品牌详情', type: BrandVo })
  @RequirePermission('pms:brand:query')
  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.brandService.findOne(id);
  }

  @ApiOperation({ summary: '创建品牌' })
  @Api({ summary: '创建品牌', body: CreateBrandDto })
  @RequirePermission('pms:brand:create')
  @Operlog({ businessType: BusinessType.INSERT })
  @Post()
  async create(@Body() dto: CreateBrandDto) {
    return this.brandService.create(dto);
  }

  @ApiOperation({ summary: '更新品牌' })
  @Api({ summary: '更新品牌', body: UpdateBrandDto })
  @RequirePermission('pms:brand:update')
  @Operlog({ businessType: BusinessType.UPDATE })
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBrandDto) {
    return this.brandService.update(id, dto);
  }

  @ApiOperation({ summary: '删除品牌' })
  @Api({ summary: '删除品牌' })
  @RequirePermission('pms:brand:delete')
  @Operlog({ businessType: BusinessType.DELETE })
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.brandService.remove(id);
  }
}
