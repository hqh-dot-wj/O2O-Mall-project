import { IsNumber, IsOptional, IsArray, IsEnum, IsBoolean, IsDateString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 满减档位 DTO
 */
export class ReductionTierDto {
  @ApiProperty({ description: '满足金额门槛' })
  @IsNumber()
  @Min(0.01, { message: '门槛金额必须大于0' })
  threshold: number;

  @ApiProperty({ description: '减免金额' })
  @IsNumber()
  @Min(0.01, { message: '减免金额必须大于0' })
  discount: number;
}

/**
 * 满减活动规则 DTO
 */
export class FullReductionRulesDto {
  @ApiProperty({ description: '满减档位配置', type: [ReductionTierDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReductionTierDto)
  tiers: ReductionTierDto[];

  @ApiProperty({ description: '适用范围', enum: ['ALL', 'CATEGORY', 'PRODUCT'] })
  @IsEnum(['ALL', 'CATEGORY', 'PRODUCT'], { message: '适用范围必须是 ALL、CATEGORY 或 PRODUCT' })
  applicableScope: 'ALL' | 'CATEGORY' | 'PRODUCT';

  @ApiProperty({ description: '适用分类ID列表', required: false })
  @IsOptional()
  @IsArray()
  categoryIds?: string[];

  @ApiProperty({ description: '适用商品ID列表', required: false })
  @IsOptional()
  @IsArray()
  productIds?: string[];

  @ApiProperty({ description: '是否可与其他优惠叠加', default: false })
  @IsOptional()
  @IsBoolean()
  stackable?: boolean;

  @ApiProperty({ description: '活动开始时间' })
  @IsDateString({}, { message: '开始时间格式不正确' })
  startTime: string;

  @ApiProperty({ description: '活动结束时间' })
  @IsDateString({}, { message: '结束时间格式不正确' })
  endTime: string;
}

/**
 * 满减计算参数 DTO
 */
export class FullReductionCalculateDto {
  @ApiProperty({ description: '订单原始金额' })
  @IsNumber()
  @Min(0.01, { message: '订单金额必须大于0' })
  originalAmount: number;

  @ApiProperty({ description: '订单商品ID列表', required: false })
  @IsOptional()
  @IsArray()
  productIds?: string[];

  @ApiProperty({ description: '订单商品分类ID列表', required: false })
  @IsOptional()
  @IsArray()
  categoryIds?: string[];
}
