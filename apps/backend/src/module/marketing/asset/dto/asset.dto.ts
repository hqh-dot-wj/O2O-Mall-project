import { ApiProperty } from '@nestjs/swagger';
import { AssetStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDecimal } from 'class-validator';
import { PageQueryDto } from 'src/common/dto/base.dto';

/**
 * 用户资产基础 DTO
 */
export class UserAssetDto {
  @ApiProperty({ description: '资产名称' })
  @IsString()
  @IsNotEmpty()
  assetName: string;

  @ApiProperty({ description: '资产类型', enum: ['VOUCHER', 'TIMES_CARD'] })
  @IsString()
  @IsNotEmpty()
  assetType: string;

  @ApiProperty({ description: '余额' })
  @IsNotEmpty()
  balance: number;

  @ApiProperty({ description: '过期时间', required: false })
  @IsOptional()
  expireTime?: Date;
}

/**
 * 分页查询资产 DTO
 */
export class ListUserAssetDto extends PageQueryDto {
  @ApiProperty({ description: '会员ID', required: false })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiProperty({ description: '状态', enum: AssetStatus, required: false })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;
}
