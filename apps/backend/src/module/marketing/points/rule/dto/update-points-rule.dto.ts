import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, Min, Max } from 'class-validator';

/**
 * 更新积分规则 DTO
 * 
 * @description 用于更新租户的积分规则配置
 */
export class UpdatePointsRuleDto {
  @ApiProperty({ description: '是否启用消费积分', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  orderPointsEnabled?: boolean;

  @ApiProperty({ description: '消费积分比例（每消费N元获得M积分）', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderPointsRatio?: number;

  @ApiProperty({ description: '消费积分基数（N元）', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  orderPointsBase?: number;

  @ApiProperty({ description: '是否启用签到积分', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  signinPointsEnabled?: boolean;

  @ApiProperty({ description: '签到积分数量', example: 10, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  signinPointsAmount?: number;

  @ApiProperty({ description: '是否启用积分有效期', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  pointsValidityEnabled?: boolean;

  @ApiProperty({ description: '积分有效天数（null表示永久有效）', example: 365, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  pointsValidityDays?: number;

  @ApiProperty({ description: '是否启用积分抵扣', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  pointsRedemptionEnabled?: boolean;

  @ApiProperty({ description: '积分抵扣比例（N积分抵扣M元）', example: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pointsRedemptionRatio?: number;

  @ApiProperty({ description: '积分抵扣基数（M元）', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  pointsRedemptionBase?: number;

  @ApiProperty({ description: '单笔订单最多可使用积分数量', example: 10000, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxPointsPerOrder?: number;

  @ApiProperty({ description: '单笔订单最多可抵扣百分比（1-100）', example: 50, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxDiscountPercentOrder?: number;

  @ApiProperty({ description: '系统开关', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  systemEnabled?: boolean;
}
