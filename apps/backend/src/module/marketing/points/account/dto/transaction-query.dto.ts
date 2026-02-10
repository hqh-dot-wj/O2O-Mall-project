import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min, IsString } from 'class-validator';
import { PointsTransactionType } from '@prisma/client';

/**
 * 积分交易查询 DTO
 * 
 * @description 用于查询积分交易记录
 */
export class TransactionQueryDto {
  @ApiProperty({ description: '会员ID（管理端筛选）', required: false })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiProperty({ description: '交易类型', enum: PointsTransactionType, required: false })
  @IsOptional()
  @IsEnum(PointsTransactionType)
  type?: PointsTransactionType;

  @ApiProperty({ description: '开始时间', required: false })
  @IsOptional()
  startTime?: Date;

  @ApiProperty({ description: '结束时间', required: false })
  @IsOptional()
  endTime?: Date;

  @ApiProperty({ description: '页码', example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageNum?: number;

  @ApiProperty({ description: '每页数量', example: 10, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}
