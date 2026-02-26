import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, Length } from 'class-validator';

export class UpdateMemberLevelDto {
  @ApiProperty({ description: '会员ID' })
  @IsString()
  memberId: string;

  @ApiProperty({ description: '目标等级' })
  @IsInt()
  @Min(0)
  @Max(10)
  targetLevel: number;

  @ApiProperty({ description: '调整原因' })
  @IsString()
  @Length(1, 255)
  reason: string;
}
