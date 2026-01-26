import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlayTemplateService } from './template.service';
import { CreatePlayTemplateDto, ListPlayTemplateDto, UpdatePlayTemplateDto } from './dto/template.dto';
import { PlayTemplateVo, PlayTemplateListVo } from './vo/template.vo';
import { Api } from 'src/common/decorators/api.decorator';

@ApiTags('营销-玩法模板')
@Controller('marketing/template')
export class PlayTemplateController {
  constructor(private readonly service: PlayTemplateService) {}

  @Get('list')
  @Api({ summary: '查询模板列表', type: PlayTemplateListVo })
  async findAll(@Query() query: ListPlayTemplateDto) {
    return await this.service.findAll(query);
  }

  @Get(':id')
  @Api({ summary: '查询模板详情', type: PlayTemplateVo })
  async findOne(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post()
  @Api({ summary: '创建玩法模板', type: PlayTemplateVo })
  async create(@Body() dto: CreatePlayTemplateDto) {
    return await this.service.create(dto);
  }

  @Put(':id')
  @Api({ summary: '更新玩法模板', type: PlayTemplateVo })
  async update(@Param('id') id: string, @Body() dto: UpdatePlayTemplateDto) {
    return await this.service.update(id, dto);
  }

  @Delete(':id')
  @Api({ summary: '删除玩法模板' })
  async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }
}
