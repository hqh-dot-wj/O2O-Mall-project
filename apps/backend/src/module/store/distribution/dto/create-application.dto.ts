import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({ description: '申请理由', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  applyReason?: string;
}
