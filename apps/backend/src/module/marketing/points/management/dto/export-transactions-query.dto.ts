import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PointsTransactionTypeApi } from '../../constants/points-transaction-type-api.enum';

/**
 * 导出积分明细查询 DTO
 */
export class ExportTransactionsQueryDto {
  @ApiProperty({ description: '会员ID', required: false })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiProperty({
    description: '交易类型',
    enum: PointsTransactionTypeApi,
    required: false,
  })
  @IsOptional()
  @IsEnum(PointsTransactionTypeApi)
  type?: PointsTransactionTypeApi;

  @ApiProperty({ description: '开始时间', required: false })
  @IsOptional()
  startTime?: Date;

  @ApiProperty({ description: '结束时间', required: false })
  @IsOptional()
  endTime?: Date;
}
