import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PageQueryDto } from 'src/common/dto/base.dto';

/**
 * 会员积分变动记录查询 DTO（分页 + memberId）
 */
export class PointHistoryQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ description: '会员 ID' })
  @IsOptional()
  @IsString()
  memberId?: string;
}
