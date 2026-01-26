import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StorePlayConfigService } from './config.service';
import { CreateStorePlayConfigDto, ListStorePlayConfigDto, UpdateStorePlayConfigDto } from './dto/config.dto';
import { StorePlayConfigVo, StorePlayConfigListVo } from './vo/config.vo';
import { Api } from 'src/common/decorators/api.decorator';
import { User, UserDto } from 'src/module/admin/system/user/user.decorator';
import { TenantContext } from 'src/common/tenant';

/**
 * 营销规则配置接口 (B端/S端)
 * @description 管理门店特有的营销玩法配置，负责配置营销规则、上下架状态及库存策略。
 */
@ApiTags('营销-门店商品配置')
@Controller('marketing/config')
export class StorePlayConfigController {
  constructor(private readonly service: StorePlayConfigService) {}

  @Get('list')
  @Api({ summary: '查询门店营销商品列表', type: StorePlayConfigListVo })
  async findAll(@Query() query: ListStorePlayConfigDto) {
    return await this.service.findAll(query);
  }

  @Get(':id')
  @Api({ summary: '查询详情', type: StorePlayConfigVo })
  async findOne(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post()
  @Api({ summary: '创建营销商品', type: StorePlayConfigVo })
  async create(@Body() dto: CreateStorePlayConfigDto, @User() user: UserDto) {
    // ✅ 中文注释：由 Token 自动解析租户 ID，确保数据隔离安全性
    const tenantId = user.user?.tenantId || TenantContext.SUPER_TENANT_ID;
    return await this.service.create(dto, tenantId);
  }

  @Put(':id')
  @Api({ summary: '更新营销商品', type: StorePlayConfigVo })
  async update(@Param('id') id: string, @Body() dto: UpdateStorePlayConfigDto) {
    return await this.service.update(id, dto);
  }

  @Patch(':id/status')
  @Api({ summary: '更新营销商品状态' })
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return await this.service.updateStatus(id, status);
  }

  @Delete(':id')
  @Api({ summary: '删除营销商品' })
  async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }
}
