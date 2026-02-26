import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, Length, ArrayMinSize, ArrayMaxSize, IsInt } from 'class-validator';
import { ReviewResult } from './review-application.dto';

export class BatchReviewDto {
  @ApiProperty({ description: '申请ID列表' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  ids: number[];

  @ApiProperty({ description: '审核结果', enum: ReviewResult })
  @IsEnum(ReviewResult)
  result: ReviewResult;

  @ApiProperty({ description: '审核备注', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  remark?: string;
}
