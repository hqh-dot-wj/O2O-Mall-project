import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlayTemplateService } from './template.service';
import { CreatePlayTemplateDto, ListPlayTemplateDto, UpdatePlayTemplateDto } from './dto/template.dto';
import { PlayTemplateVo, PlayTemplateListVo } from './vo/template.vo';
import { Api } from 'src/common/decorators/api.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { Operlog } from 'src/module/admin/common/decorators/operlog.decorator';
import { BusinessType } from 'src/common/constant/business.constant';

@ApiTags('营销-玩法模板')
@Controller('marketing/template')
@ApiBearerAuth('Authorization')
export class PlayTemplateController {
  constructor(private readonly service: PlayTemplateService) {}

  @Get('list')
  @Api({ summary: '查询模板列表', type: PlayTemplateListVo })
  @RequirePermission('marketing:template:list')
  async findAll(@Query() query: ListPlayTemplateDto) {
    return await this.service.findAll(query);
  }

  @Get(':id')
  @Api({ summary: '查询模板详情', type: PlayTemplateVo })
  @RequirePermission('marketing:template:query')
  async findOne(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post()
  @Api({ summary: '创建玩法模板', type: PlayTemplateVo })
  @RequirePermission('marketing:template:add')
  @Operlog({ businessType: BusinessType.INSERT })
  async create(@Body() dto: CreatePlayTemplateDto) {
    return await this.service.create(dto);
  }

  @Put(':id')
  @Api({ summary: '更新玩法模板', type: PlayTemplateVo })
  @RequirePermission('marketing:template:edit')
  @Operlog({ businessType: BusinessType.UPDATE })
  async update(@Param('id') id: string, @Body() dto: UpdatePlayTemplateDto) {
    return await this.service.update(id, dto);
  }

  @Delete(':id')
  @Api({ summary: '删除玩法模板' })
  @RequirePermission('marketing:template:delete')
  @Operlog({ businessType: BusinessType.DELETE })
  async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }
}
