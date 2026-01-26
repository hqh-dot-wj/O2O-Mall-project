import { ApiProperty } from '@nestjs/swagger';
import { AssetStatus } from '@prisma/client';

export class UserAssetVo {
  @ApiProperty({ description: '资产ID' })
  id: string;

  @ApiProperty({ description: '租户ID' })
  tenantId: string;

  @ApiProperty({ description: '会员ID' })
  memberId: string;

  @ApiProperty({ description: '活动配置ID' })
  configId: string;

  @ApiProperty({ description: '来源实例ID' })
  instanceId: string;

  @ApiProperty({ description: '资产名称' })
  assetName: string;

  @ApiProperty({ description: '资产类型' })
  assetType: string;

  @ApiProperty({ description: '当前余额/剩余次数' })
  balance: number;

  @ApiProperty({ description: '初始总额' })
  initialBalance: number;

  @ApiProperty({ description: '状态', enum: AssetStatus })
  status: AssetStatus;

  @ApiProperty({ description: '核销代码', required: false })
  consumeCode?: string;

  @ApiProperty({ description: '过期时间' })
  expireTime: string;

  @ApiProperty({ description: '创建时间' })
  createTime: string;
}

export class UserAssetListVo {
  @ApiProperty({ description: '资产列表', type: [UserAssetVo] })
  rows: UserAssetVo[];

  @ApiProperty({ description: '总条数' })
  total: number;
}
