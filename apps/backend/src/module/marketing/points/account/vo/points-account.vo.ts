import { ApiProperty } from '@nestjs/swagger';

/**
 * 积分账户 VO
 * 
 * @description 积分账户的视图对象
 */
export class PointsAccountVo {
  @ApiProperty({ description: '账户ID' })
  id: string;

  @ApiProperty({ description: '租户ID' })
  tenantId: string;

  @ApiProperty({ description: '用户ID' })
  memberId: string;

  @ApiProperty({ description: '总积分（累计获得）' })
  totalPoints: number;

  @ApiProperty({ description: '可用积分' })
  availablePoints: number;

  @ApiProperty({ description: '冻结积分' })
  frozenPoints: number;

  @ApiProperty({ description: '已使用积分' })
  usedPoints: number;

  @ApiProperty({ description: '已过期积分' })
  expiredPoints: number;

  @ApiProperty({ description: '版本号（乐观锁）' })
  version: number;

  @ApiProperty({ description: '创建时间' })
  createTime: Date;

  @ApiProperty({ description: '更新时间' })
  updateTime: Date;
}

/**
 * 积分余额 VO
 * 
 * @description 积分余额的简化视图对象
 */
export class PointsBalanceVo {
  @ApiProperty({ description: '可用积分' })
  availablePoints: number;

  @ApiProperty({ description: '冻结积分' })
  frozenPoints: number;

  @ApiProperty({ description: '即将过期积分（30天内）' })
  expiringPoints: number;
}
