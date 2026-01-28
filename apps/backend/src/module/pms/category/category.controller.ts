import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto, ListCategoryDto } from './dto';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { Operlog } from 'src/module/admin/common/decorators/operlog.decorator';
import { BusinessType } from 'src/common/constant/business.constant';

/**
 * 分类管理控制器
 */
@ApiTags('分类管理')
@Controller('admin/pms/category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: '获取分类树' })
  @RequirePermission('pms:category:list')
  @Get('tree')
  async getTree() {
    return this.categoryService.findTree();
  }

  @ApiOperation({ summary: '查询分类列表' })
  @RequirePermission('pms:category:list')
  @Get('list')
  async list(@Query() query: ListCategoryDto) {
    return this.categoryService.findAll(query);
  }

  @ApiOperation({ summary: '查询分类详情' })
  @RequirePermission('pms:category:query')
  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findOne(id);
  }

  @ApiOperation({ summary: '创建分类' })
  @RequirePermission('pms:category:create')
  @Operlog({ businessType: BusinessType.INSERT })
  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @ApiOperation({ summary: '更新分类' })
  @RequirePermission('pms:category:update')
  @Operlog({ businessType: BusinessType.UPDATE })
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @ApiOperation({ summary: '删除分类' })
  @RequirePermission('pms:category:delete')
  @Operlog({ businessType: BusinessType.DELETE })
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.remove(id);
  }
}
