import { IsNumber, IsOptional, IsArray, ValidateNested, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GroupBuySkuRuleDto {
  @ApiProperty({ description: 'SKU ID' })
  @IsNotEmpty({ message: 'SKU ID不能为空' })
  skuId: string;

  @ApiProperty({ description: '拼团价格' })
  @IsNumber()
  @Min(0.01, { message: '价格必须大于0' })
  price: number;
}

export class GroupBuyRulesDto {
  @ApiProperty({ description: '默认拼团价格' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: '价格不能为负数' })
  price?: number;

  @ApiProperty({ description: '最小成团人数', default: 2 })
  @IsOptional()
  @IsNumber()
  @Min(2, { message: '最小成团人数不能少于2人' })
  minCount?: number;

  @ApiProperty({ description: '最大成团人数' })
  @IsOptional()
  @IsNumber()
  maxCount?: number;

  @ApiProperty({ description: '拼团有效期(小时/天)', default: 24 })
  @IsOptional()
  @IsNumber()
  @Min(0.1, { message: '有效期必须大于0' })
  validDays?: number;

  @ApiProperty({ description: 'SKU特定配置', type: [GroupBuySkuRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupBuySkuRuleDto)
  skus?: GroupBuySkuRuleDto[];
}

export class GroupBuyJoinDto {
  @ApiProperty({ description: '要加入的团ID (父实例ID)' })
  @IsOptional()
  groupId?: string;
}
