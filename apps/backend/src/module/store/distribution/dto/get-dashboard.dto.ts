import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class GetDashboardDto {
  @ApiProperty({ description: '开始日期', required: false, example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: '结束日期', required: false, example: '2026-02-26' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
