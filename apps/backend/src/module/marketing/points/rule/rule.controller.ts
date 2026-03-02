import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PointsRuleService } from './rule.service';
import { UpdatePointsRuleDto } from './dto/update-points-rule.dto';
import { Api } from 'src/common/decorators/api.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { Operlog } from 'src/module/admin/common/decorators/operlog.decorator';
import { BusinessType } from 'src/common/constant/business.constant';

/**
 * 积分规则控制器
 * 
 * @description 提供积分规则的查询和配置接口
 */
@ApiTags('积分规则')
@Controller('admin/marketing/points/rules')
@ApiBearerAuth('Authorization')
export class PointsRuleController {
  constructor(private readonly ruleService: PointsRuleService) {}

  @Get()
  @Api({ summary: '获取积分规则配置' })
  @RequirePermission('marketing:points:rule:query')
  async getRules() {
    return this.ruleService.getRules();
  }

  @Put()
  @Api({ summary: '更新积分规则配置' })
  @RequirePermission('marketing:points:rule:edit')
  @Operlog({ businessType: BusinessType.UPDATE })
  async updateRules(@Body() dto: UpdatePointsRuleDto) {
    return this.ruleService.updateRules(dto);
  }
}
