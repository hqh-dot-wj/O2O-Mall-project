import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PageQueryDto } from 'src/common/dto/base.dto';

export class ListMemberLevelLogDto extends PageQueryDto {
  @ApiProperty({ description: '会员ID', required: false })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiProperty({ description: '变更类型', required: false, enum: ['UPGRADE', 'DOWNGRADE', 'MANUAL'] })
  @IsOptional()
  @IsEnum(['UPGRADE', 'DOWNGRADE', 'MANUAL'])
  changeType?: string;
}
