import { ApiProperty } from '@nestjs/swagger';

export class MatchTenantVo {
  @ApiProperty({ description: '租户ID' })
  tenantId: string;

  @ApiProperty({ description: '公司名称' })
  companyName: string;
}

export class NearbyTenantVo {
  @ApiProperty({ description: '租户ID' })
  tenantId: string;

  @ApiProperty({ description: '公司名称' })
  companyName: string;

  @ApiProperty({ description: '距离(公里)' })
  distance: number;
}
