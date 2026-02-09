import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PointsTransactionType } from '@prisma/client';

/**
 * 扣减积分 DTO
 * 
 * @description 用于扣减用户积分
 */
export class DeductPointsDto {
  @ApiProperty({ description: '用户ID' })
  @IsString()
  memberId: string;

  @ApiProperty({ description: '积分数量', example: 100 })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ description: '交易类型', enum: PointsTransactionType })
  @IsEnum(PointsTransactionType)
  type: PointsTransactionType;

  @ApiProperty({ description: '关联ID（订单ID等）', required: false })
  @IsOptional()
  @IsString()
  relatedId?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}
