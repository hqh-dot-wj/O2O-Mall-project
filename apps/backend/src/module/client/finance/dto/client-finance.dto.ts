import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PageQueryDto } from 'src/common/dto/base.dto';
import { WithdrawalStatus, TransType, CommissionStatus } from '@prisma/client';

export class WalletVo {
  @ApiProperty({ description: '总资产' })
  totalAssets: number;

  @ApiProperty({ description: '可用余额' })
  balance: number;

  @ApiProperty({ description: '冻结金额' })
  frozen: number;

  @ApiProperty({ description: '累计收益' })
  totalIncome: number;
}

export class ApplyWithdrawalDto {
  @ApiProperty({ description: '提现金额' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: '提现方式', example: 'WECHAT_WALLET' })
  @IsString()
  method: string;

  @ApiProperty({ description: '真实姓名(选填)' })
  @IsOptional()
  @IsString()
  realName?: string;

  @ApiProperty({ description: '账号(选填)' })
  @IsOptional()
  @IsString()
  accountNo?: string;
}

export class ListTransactionDto extends PageQueryDto {
  @ApiProperty({ description: '交易类型', enum: TransType, required: false })
  @IsOptional()
  @IsEnum(TransType)
  type?: TransType;
}

export class ListCommissionDto extends PageQueryDto {
  @ApiProperty({ description: '状态', enum: CommissionStatus, required: false })
  @IsOptional()
  @IsEnum(CommissionStatus)
  status?: CommissionStatus;
}

export class ListWithdrawalDto extends PageQueryDto {
  @ApiProperty({ description: '状态', enum: WithdrawalStatus, required: false })
  @IsOptional()
  @IsEnum(WithdrawalStatus)
  status?: WithdrawalStatus;
}
