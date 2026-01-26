import { Controller, Get, Post, Put, Delete, Body, Query, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { MessageService } from './message.service';
import { ListMessageDto, CreateMessageDto } from './dto/message.dto';
import { MessageVo } from './vo/message.vo';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';

@ApiTags('系统消息')
@Controller('system/message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('list')
  @Api({ summary: '查询消息列表', type: MessageVo })
  // @RequirePermission('system:message:list') // 暂时注释，视权限需求而定
  async findAll(@Query() query: ListMessageDto) {
    const tenantId = TenantContext.getTenantId();
    return await this.messageService.findAll(query, tenantId);
  }

  @Post()
  @ApiOperation({ summary: '发送消息 (测试用)' })
  async create(@Body() dto: CreateMessageDto) {
    return await this.messageService.create(dto);
  }

  @Put(':id/read')
  @ApiOperation({ summary: '标记已读' })
  async read(@Param('id', ParseIntPipe) id: number) {
    return await this.messageService.read(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除消息' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return await this.messageService.delete(id);
  }
}
