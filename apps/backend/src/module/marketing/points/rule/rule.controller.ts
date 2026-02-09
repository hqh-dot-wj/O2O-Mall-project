import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PointsRuleService } from './rule.service';
import { UpdatePointsRuleDto } from './dto/update-points-rule.dto';
import { Result } from 'src/common/response/result';
import { PointsRuleVo } from './vo/points-rule.vo';

/**
 * 积分规则控制器
 * 
 * @description 提供积分规则的查询和配置接口
 */
@ApiTags('积分规则')
@Controller('admin/marketing/points/rules')
export class PointsRuleController {
  constructor(private readonly ruleService: PointsRuleService) {}

  @Get()
  @ApiOperation({ summary: '获取积分规则配置' })
  async getRules() {
    return this.ruleService.getRules();
  }

  @Put()
  @ApiOperation({ summary: '更新积分规则配置' })
  async updateRules(@Body() dto: UpdatePointsRuleDto) {
    return this.ruleService.updateRules(dto);
  }
}
