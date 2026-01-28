import { IsOptional, IsString } from 'class-validator';
import { PageQueryDto } from 'src/common/dto/base.dto';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 查询会员列表 Dto
 */
export class ListMemberDto extends PageQueryDto {
  @ApiProperty({ description: '会员昵称', required: false })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiProperty({ description: '手机号', required: false })
  @IsOptional()
  @IsString()
  mobile?: string;
}
