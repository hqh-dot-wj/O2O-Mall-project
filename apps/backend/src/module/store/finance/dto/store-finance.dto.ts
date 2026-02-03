import { PageQueryDto } from 'src/common/dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CommissionStatus, WithdrawalStatus } from '@prisma/client';

/**
 * 佣金列表查询DTO
 */
export class ListCommissionDto extends PageQueryDto {
  @ApiProperty({ description: '订单号', required: false })
  @IsOptional()
  @IsString()
  orderSn?: string;

  @ApiProperty({ description: '用户手机号', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: '佣金状态', enum: CommissionStatus, required: false })
  @IsOptional()
  @IsEnum(CommissionStatus)
  status?: CommissionStatus;

  @ApiProperty({ description: '会员ID', required: false })
  @IsOptional()
  @IsString()
  memberId?: string;
}

/**
 * 提现列表查询DTO
 */
export class ListWithdrawalDto extends PageQueryDto {
  @ApiProperty({ description: '提现状态', enum: WithdrawalStatus, required: false })
  @IsOptional()
  @IsEnum(WithdrawalStatus)
  status?: WithdrawalStatus;

  @ApiProperty({ description: '会员ID', required: false })
  @IsOptional()
  @IsString()
  memberId?: string;
}

/**
 * 提现审核DTO
 */
export class AuditWithdrawalDto {
  @ApiProperty({ description: '提现ID' })
  @IsString()
  withdrawalId: string;

  @ApiProperty({ description: '审核操作', enum: ['APPROVE', 'REJECT'] })
  @IsEnum(['APPROVE', 'REJECT'])
  action: 'APPROVE' | 'REJECT';

  @ApiProperty({ description: '审核备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

/**
 * 流水列表查询DTO
 */
export class ListLedgerDto extends PageQueryDto {
  @ApiProperty({ description: '交易类型', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: '会员ID', required: false })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiProperty({ description: '订单号/交易ID', required: false })
  @IsOptional()
  @IsString()
  relatedId?: string;

  @ApiProperty({ description: '用户搜索（姓名/手机号）', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '最小金额', required: false })
  @IsOptional()
  minAmount?: number;

  @ApiProperty({ description: '最大金额', required: false })
  @IsOptional()
  maxAmount?: number;
}
