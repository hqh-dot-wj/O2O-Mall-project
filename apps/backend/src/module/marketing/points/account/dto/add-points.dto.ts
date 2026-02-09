import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PointsTransactionType } from '@prisma/client';

/**
 * 增加积分 DTO
 * 
 * @description 用于增加用户积分
 */
export class AddPointsDto {
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

  @ApiProperty({ description: '关联ID（订单ID、任务ID等）', required: false })
  @IsOptional()
  @IsString()
  relatedId?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ description: '过期时间（null表示永久有效）', required: false })
  @IsOptional()
  expireTime?: Date;
}
