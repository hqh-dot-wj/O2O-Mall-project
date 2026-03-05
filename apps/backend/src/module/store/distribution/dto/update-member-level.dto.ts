import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, Length } from 'class-validator';

/**
 * 手动调整会员等级 Dto（分销模块）
 * @description 与 admin/member 的 AdminUpdateMemberLevelDto 区分，避免 Swagger 重复 schema
 */
export class StoreUpdateMemberLevelDto {
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
