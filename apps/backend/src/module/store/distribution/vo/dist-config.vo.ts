import { ApiProperty } from '@nestjs/swagger';

export class DistConfigVo {
  @ApiProperty({ description: '配置ID' })
  id: number;

  @ApiProperty({ description: '一级分佣比例 (0-100)' })
  level1Rate: number;

  @ApiProperty({ description: '二级分佣比例 (0-100)' })
  level2Rate: number;

  @ApiProperty({ description: '是否允许普通用户分销' })
  enableLV0: boolean;

  // === 跨店分销配置 ===
  @ApiProperty({ description: '是否允许外店推荐人获取佣金' })
  enableCrossTenant: boolean;

  @ApiProperty({ description: '跨店分佣折扣 (0-100)' })
  crossTenantRate: number;

  @ApiProperty({ description: '跨店佣金日限额 (元)' })
  crossMaxDaily: number;

  @ApiProperty({ description: '创建时间' })
  createTime: string;
}

export class DistConfigLogVo {
  @ApiProperty({ description: '日志ID' })
  id: number;

  @ApiProperty({ description: '配置ID' })
  configId: number;

  @ApiProperty({ description: '一级分佣比例 (0-100)' })
  level1Rate: number;

  @ApiProperty({ description: '二级分佣比例 (0-100)' })
  level2Rate: number;

  @ApiProperty({ description: '是否允许普通用户分销' })
  enableLV0: boolean;

  // === 跨店分销配置 ===
  @ApiProperty({ description: '是否允许外店推荐人获取佣金', required: false })
  enableCrossTenant?: boolean;

  @ApiProperty({ description: '跨店分佣折扣 (0-100)', required: false })
  crossTenantRate?: number;

  @ApiProperty({ description: '跨店佣金日限额 (元)', required: false })
  crossMaxDaily?: number;

  @ApiProperty({ description: '操作人' })
  operator: string;

  @ApiProperty({ description: '创建时间' })
  createTime: string;
}
