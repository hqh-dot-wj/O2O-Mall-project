import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export enum ReviewResult {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ReviewApplicationDto {
  @ApiProperty({ description: '审核结果', enum: ReviewResult })
  @IsEnum(ReviewResult)
  result: ReviewResult;

  @ApiProperty({ description: '审核备注', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  remark?: string;
}
