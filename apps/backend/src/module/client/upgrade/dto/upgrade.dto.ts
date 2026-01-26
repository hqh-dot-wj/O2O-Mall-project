import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyUpgradeDto {
  @ApiProperty({ description: '目标等级: 1=C1团长, 2=C2股东' })
  @IsEnum([1, 2])
  targetLevel: number;

  @ApiProperty({ description: '申请类型: REFERRAL_CODE/PRODUCT_PURCHASE', required: false })
  @IsOptional()
  @IsString()
  applyType?: string;

  @ApiProperty({ description: '推荐码 (扫码申请时)', required: false })
  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class UpgradeByOrderDto {
  @ApiProperty({ description: '订单ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '目标等级' })
  targetLevel: number;
}
