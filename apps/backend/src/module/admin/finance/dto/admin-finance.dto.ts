import { PageQueryDto } from 'src/common/dto';
import { IsOptional, IsString, IsEnum, IsNumber, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CommissionStatus, WithdrawalStatus, WalletStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

/**
 * 钱包列表查询DTO
 */
export class ListWalletDto extends PageQueryDto {
  @ApiProperty({ description: '钱包状态', enum: WalletStatus, required: false })
  @IsOptional()
  @IsEnum(WalletStatus)
  status?: WalletStatus;

  @ApiProperty({ description: '搜索关键字(用户昵称/手机号)', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '最小余额', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minBalance?: number;

  @ApiProperty({ description: '最大余额', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxBalance?: number;
}

/**
 * 冻结钱包DTO
 */
export class FreezeWalletDto {
  @ApiProperty({ description: '钱包ID' })
  @IsString()
  walletId: string;

  @ApiProperty({ description: '冻结原因' })
  @IsString()
  reason: string;
}

/**
 * 佣金列表查询DTO
 */
export class ListCommissionDto extends PageQueryDto {
  @ApiProperty({ description: '佣金状态', enum: CommissionStatus, required: false })
  @IsOptional()
  @IsEnum(CommissionStatus)
  status?: CommissionStatus;

  @ApiProperty({ description: '订单ID', required: false })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty({ description: '订单号', required: false })
  @IsOptional()
  @IsString()
  orderSn?: string;

  @ApiProperty({ description: '受益人ID', required: false })
  @IsOptional()
  @IsString()
  beneficiaryId?: string;

  @ApiProperty({ description: '搜索关键字(用户昵称/手机号)', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '佣金层级(1=一级, 2=二级)', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  level?: number;

  @ApiProperty({ description: '开始时间', required: false })
  @IsOptional()
  @Type(() => Date)
  startTime?: Date;

  @ApiProperty({ description: '结束时间', required: false })
  @IsOptional()
  @Type(() => Date)
  endTime?: Date;
}

/**
 * 提现列表查询DTO
 */
export class ListWithdrawalDto extends PageQueryDto {
  @ApiProperty({ description: '提现状态', enum: WithdrawalStatus, required: false })
  @IsOptional()
  @IsEnum(WithdrawalStatus)
  status?: WithdrawalStatus;

  @ApiProperty({ description: '搜索关键字(用户昵称/手机号)', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '开始时间', required: false })
  @IsOptional()
  @Type(() => Date)
  startTime?: Date;

  @ApiProperty({ description: '结束时间', required: false })
  @IsOptional()
  @Type(() => Date)
  endTime?: Date;
}

/**
 * 导出提现DTO
 */
export class ExportWithdrawalDto {
  @ApiProperty({ description: '提现状态', enum: WithdrawalStatus, required: false })
  @IsOptional()
  @IsEnum(WithdrawalStatus)
  status?: WithdrawalStatus;

  @ApiProperty({ description: '搜索关键字', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '开始时间', required: false })
  @IsOptional()
  @Type(() => Date)
  startTime?: Date;

  @ApiProperty({ description: '结束时间', required: false })
  @IsOptional()
  @Type(() => Date)
  endTime?: Date;
}

/**
 * 结算日志查询DTO
 */
export class ListSettlementLogDto extends PageQueryDto {
  @ApiProperty({ description: '触发类型', enum: ['SCHEDULED', 'MANUAL'], required: false })
  @IsOptional()
  @IsString()
  triggerType?: 'SCHEDULED' | 'MANUAL';

  @ApiProperty({ description: '是否有错误', required: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasError?: boolean;

  @ApiProperty({ description: '开始时间', required: false })
  @IsOptional()
  @Type(() => Date)
  startTime?: Date;

  @ApiProperty({ description: '结束时间', required: false })
  @IsOptional()
  @Type(() => Date)
  endTime?: Date;
}
