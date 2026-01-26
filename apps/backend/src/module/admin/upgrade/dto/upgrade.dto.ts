import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PageQueryDto } from 'src/common/dto/base.dto';

export class ListUpgradeApplyDto extends PageQueryDto {
  @ApiProperty({ description: '会员ID', required: false })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiProperty({ description: '状态: PENDING/APPROVED/REJECTED', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: '申请类型: PRODUCT_PURCHASE/REFERRAL_CODE', required: false })
  @IsOptional()
  @IsString()
  applyType?: string;
}

export class ApproveUpgradeDto {
  @ApiProperty({ description: '操作: approve/reject' })
  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiProperty({ description: '驳回原因', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ManualLevelDto {
  @ApiProperty({ description: '目标等级: 0/1/2' })
  @IsEnum([0, 1, 2])
  targetLevel: number;

  @ApiProperty({ description: '操作原因', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
