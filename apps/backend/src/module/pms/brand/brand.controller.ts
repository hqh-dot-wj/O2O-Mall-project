import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { BrandService } from './brand.service';
import { Prisma } from '@prisma/client';

@ApiTags('品牌管理')
@Controller('pms/brand')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Api({ summary: '获取品牌列表' })
  @Get('list')
  async getList(@Query() query: any) {
    return this.brandService.findAll(query);
  }

  @Api({ summary: '创建品牌' })
  @Post()
  async create(@Body() body: Prisma.PmsBrandCreateInput) {
    return this.brandService.create(body);
  }

  @Api({ summary: '更新品牌' })
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: Prisma.PmsBrandUpdateInput) {
    return this.brandService.update(id, body);
  }

  @Api({ summary: '删除品牌' })
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.brandService.remove(id);
  }
}
