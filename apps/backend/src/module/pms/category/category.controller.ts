import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { CategoryService } from './category.service';
import { Prisma } from '@prisma/client';

@ApiTags('分类管理')
@Controller('pms/category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Api({ summary: '获取分类树' })
  @Get('tree')
  async getTree() {
    return this.categoryService.findTree();
  }

  @Get('list')
  async getList(@Query() query: any) {
    return this.categoryService.findAll(query);
  }

  @Api({ summary: '创建分类' })
  @Post()
  async create(@Body() body: Prisma.PmsCategoryCreateInput) {
    return this.categoryService.create(body);
  }

  @Api({ summary: '更新分类' })
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: Prisma.PmsCategoryUpdateInput) {
    return this.categoryService.update(id, body);
  }

  @Api({ summary: '删除分类' })
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.remove(id);
  }
}
