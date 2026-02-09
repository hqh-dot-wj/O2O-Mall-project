import { ApiProperty } from '@nestjs/swagger';

/**
 * 积分规则 VO
 * 
 * @description 积分规则配置的视图对象
 */
export class PointsRuleVo {
  @ApiProperty({ description: '规则ID' })
  id: string;

  @ApiProperty({ description: '租户ID' })
  tenantId: string;

  @ApiProperty({ description: '是否启用消费积分' })
  orderPointsEnabled: boolean;

  @ApiProperty({ description: '消费积分比例（每消费N元获得M积分）' })
  orderPointsRatio: number;

  @ApiProperty({ description: '消费积分基数（N元）' })
  orderPointsBase: number;

  @ApiProperty({ description: '是否启用签到积分' })
  signinPointsEnabled: boolean;

  @ApiProperty({ description: '签到积分数量' })
  signinPointsAmount: number;

  @ApiProperty({ description: '是否启用积分有效期' })
  pointsValidityEnabled: boolean;

  @ApiProperty({ description: '积分有效天数（null表示永久有效）' })
  pointsValidityDays: number | null;

  @ApiProperty({ description: '是否启用积分抵扣' })
  pointsRedemptionEnabled: boolean;

  @ApiProperty({ description: '积分抵扣比例（N积分抵扣M元）' })
  pointsRedemptionRatio: number;

  @ApiProperty({ description: '积分抵扣基数（M元）' })
  pointsRedemptionBase: number;

  @ApiProperty({ description: '单笔订单最多可使用积分数量' })
  maxPointsPerOrder: number | null;

  @ApiProperty({ description: '单笔订单最多可抵扣百分比（1-100）' })
  maxDiscountPercentOrder: number | null;

  @ApiProperty({ description: '系统开关' })
  systemEnabled: boolean;

  @ApiProperty({ description: '创建人' })
  createBy: string;

  @ApiProperty({ description: '创建时间' })
  createTime: Date;

  @ApiProperty({ description: '更新人' })
  updateBy: string | null;

  @ApiProperty({ description: '更新时间' })
  updateTime: Date;
}
