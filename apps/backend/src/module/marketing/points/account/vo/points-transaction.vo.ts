import { ApiProperty } from '@nestjs/swagger';
import { PointsTransactionType, PointsTransactionStatus } from '@prisma/client';

/**
 * 积分交易记录 VO
 * 
 * @description 积分交易记录的视图对象
 */
export class PointsTransactionVo {
  @ApiProperty({ description: '交易ID' })
  id: string;

  @ApiProperty({ description: '租户ID' })
  tenantId: string;

  @ApiProperty({ description: '账户ID' })
  accountId: string;

  @ApiProperty({ description: '用户ID' })
  memberId: string;

  @ApiProperty({ description: '交易类型', enum: PointsTransactionType })
  type: PointsTransactionType;

  @ApiProperty({ description: '积分数量（正数为增加，负数为扣减）' })
  amount: number;

  @ApiProperty({ description: '交易前余额' })
  balanceBefore: number;

  @ApiProperty({ description: '交易后余额' })
  balanceAfter: number;

  @ApiProperty({ description: '交易状态', enum: PointsTransactionStatus })
  status: PointsTransactionStatus;

  @ApiProperty({ description: '关联ID（订单ID、任务ID等）' })
  relatedId: string | null;

  @ApiProperty({ description: '备注' })
  remark: string | null;

  @ApiProperty({ description: '过期时间' })
  expireTime: Date | null;

  @ApiProperty({ description: '创建时间' })
  createTime: Date;
}

/**
 * 积分交易列表 VO
 * 
 * @description 积分交易记录列表的视图对象
 */
export class PointsTransactionListVo {
  @ApiProperty({ description: '交易记录列表', type: [PointsTransactionVo] })
  records: PointsTransactionVo[];

  @ApiProperty({ description: '总数' })
  total: number;
}
