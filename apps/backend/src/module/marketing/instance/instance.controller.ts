import { Body, Controller, Get, Param, Post, Put, Query, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlayInstanceService } from './instance.service';
import { CreatePlayInstanceDto, ListPlayInstanceDto } from './dto/instance.dto';
import { PlayInstanceStatus } from '@prisma/client';
import { Idempotent } from 'src/common/decorators/idempotent.decorator';
import { PlayInstanceVo, PlayInstanceListVo } from './vo/instance.vo';
import { Api } from 'src/common/decorators/api.decorator';

/**
 * 营销实例接口 (交易流转)
 * @description 处理用户参与营销活动的具体实例记录，管理从发起支付到权益发放的全生命周期。
 */
@ApiTags('营销-玩法实例')
@Controller('marketing/instance')
export class PlayInstanceController {
  constructor(private readonly service: PlayInstanceService) {}

  @Get('list')
  @Api({ summary: '查询实例列表', type: PlayInstanceListVo })
  async findAll(@Query() query: ListPlayInstanceDto) {
    return await this.service.findAll(query);
  }

  @Get(':id')
  @Api({ summary: '查询实例详情', type: PlayInstanceVo })
  async findOne(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post()
  @Idempotent() // ✅ 中文注释：防重逻辑，确保同一请求不会多次创建实例
  @Api({ summary: '参与玩法 (创建实例)', type: PlayInstanceVo })
  async create(@Body() dto: CreatePlayInstanceDto) {
    return await this.service.create(dto);
  }

  /**
   * 手动触发状态流转 (通常由系统内部或其他模块回调触发)
   */
  @Patch(':id/status')
  @Api({ summary: '更新实例状态', type: PlayInstanceVo })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: PlayInstanceStatus,
    @Body('extraData') extraData?: any,
  ) {
    return await this.service.transitStatus(id, status, extraData);
  }
}
