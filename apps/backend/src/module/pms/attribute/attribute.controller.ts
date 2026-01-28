import { Controller, Post, Body, Get, Param, Query, Put, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AttributeService } from './attribute.service';
import { CreateTemplateDto } from './dto/attribute.dto';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { Operlog } from 'src/module/admin/common/decorators/operlog.decorator';
import { BusinessType } from 'src/common/constant/business.constant';

/**
 * 属性模板管理控制器
 */
@ApiTags('属性模板管理')
@Controller('admin/pms/attribute')
export class AttributeController {
  constructor(private readonly service: AttributeService) {}

  @ApiOperation({ summary: '查询模板列表' })
  @RequirePermission('pms:attribute:list')
  @Get('template/list')
  async list(@Query() query: { pageNum?: number; pageSize?: number; name?: string }) {
    return this.service.findAll(query);
  }

  @ApiOperation({ summary: '查询模板详情' })
  @RequirePermission('pms:attribute:query')
  @Get('template/:id')
  async getOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @ApiOperation({ summary: '创建属性模板' })
  @RequirePermission('pms:attribute:create')
  @Operlog({ businessType: BusinessType.INSERT })
  @Post('template')
  async create(@Body() dto: CreateTemplateDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: '更新属性模板' })
  @RequirePermission('pms:attribute:update')
  @Operlog({ businessType: BusinessType.UPDATE })
  @Put('template/:id')
  async update(@Param('id') id: string, @Body() dto: CreateTemplateDto) {
    return this.service.update(+id, dto);
  }

  @ApiOperation({ summary: '删除属性模板' })
  @RequirePermission('pms:attribute:delete')
  @Operlog({ businessType: BusinessType.DELETE })
  @Delete('template/:id')
  async remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  @ApiOperation({ summary: '根据分类ID获取属性列表' })
  @RequirePermission('pms:attribute:query')
  @Get('category/:catId')
  async getByCategory(@Param('catId') catId: string) {
    return this.service.getByCategory(+catId);
  }
}
