import { Body, Controller, Get, Param, Post, Query, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserAssetService } from './asset.service';
import { ListUserAssetDto } from './dto/asset.dto';
import { UserAssetVo, UserAssetListVo } from './vo/asset.vo';
import { Api } from 'src/common/decorators/api.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { Operlog } from 'src/module/admin/common/decorators/operlog.decorator';
import { BusinessType } from 'src/common/constant/business.constant';

/**
 * 营销资产管理 (履约/核销接口)
 * @description
 * 用户参与营销活动获得的“虚拟权益”资产管理。
 * 支持分页查询资产列表、查看详细核销码、执行核销操作等履约核心业务。
 */
@ApiTags('营销-用户资产')
@Controller('marketing/asset')
@ApiBearerAuth('Authorization')
export class UserAssetController {
  constructor(private readonly service: UserAssetService) {}

  @Get('list')
  @Api({ summary: '查询用户资产列表', type: UserAssetListVo })
  @RequirePermission('marketing:asset:list')
  async findAll(@Query() query: ListUserAssetDto) {
    return await this.service.findAll(query);
  }

  @Get(':id')
  @Api({ summary: '查询资产详情', type: UserAssetVo })
  @RequirePermission('marketing:asset:query')
  async findOne(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post(':id/consume')
  @Api({ summary: '核销资产', type: UserAssetVo })
  @RequirePermission('marketing:asset:consume')
  @Operlog({ businessType: BusinessType.UPDATE })
  async consume(@Param('id') id: string, @Body('amount') amount: number = 1) {
    // ✅ 中文注释：执行资产核销扣减（例如核销一张次卡），返回更新后的资产状态
    return await this.service.consumeAsset(id, amount);
  }
}
