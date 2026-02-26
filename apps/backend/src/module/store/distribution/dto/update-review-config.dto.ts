import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, Min } from 'class-validator';

export class UpdateReviewConfigDto {
  @ApiProperty({ description: '是否启用自动审核' })
  @IsBoolean()
  enableAutoReview: boolean;

  @ApiProperty({ description: '最小注册天数' })
  @IsInt()
  @Min(0)
  minRegisterDays: number;

  @ApiProperty({ description: '最小订单数' })
  @IsInt()
  @Min(0)
  minOrderCount: number;

  @ApiProperty({ description: '最小消费金额' })
  @IsNumber()
  @Min(0)
  minOrderAmount: number;

  @ApiProperty({ description: '是否要求实名' })
  @IsBoolean()
  requireRealName: boolean;

  @ApiProperty({ description: '是否要求手机号' })
  @IsBoolean()
  requirePhone: boolean;
}
