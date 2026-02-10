import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 管理员调整会员积分 DTO
 */
export class AdjustMemberPointsDto {
  @ApiProperty({ description: '会员 ID' })
  @IsNotEmpty({ message: '会员 ID 不能为空' })
  @IsString()
  memberId: string;

  @ApiProperty({ description: '变动积分（正数增加，负数扣减，不能为 0）' })
  @IsNotEmpty({ message: '变动积分不能为空' })
  @IsInt()
  amount: number;

  @ApiPropertyOptional({ description: '备注/调整原因' })
  @IsOptional()
  @IsString()
  remark?: string;
}
