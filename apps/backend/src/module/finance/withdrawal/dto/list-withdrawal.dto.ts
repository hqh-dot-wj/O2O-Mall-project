import { PageQueryDto } from 'src/common/dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WithdrawalStatus } from '@prisma/client';

export class ListWithdrawalDto extends PageQueryDto {
  @ApiProperty({ description: '状态', enum: WithdrawalStatus, required: false })
  @IsOptional()
  @IsEnum(WithdrawalStatus)
  status?: WithdrawalStatus;

  @ApiProperty({ description: '搜索关键字(用户昵称/手机号)', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '会员ID', required: false })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiProperty({ description: '租户ID (仅总部可用)', required: false })
  @IsOptional()
  @IsString()
  tenantId?: string;
}
