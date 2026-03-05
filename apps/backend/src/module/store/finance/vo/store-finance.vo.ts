import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionStatus } from '@prisma/client';

/**
 * Store 端资金看板 VO
 */
export class StoreFinanceDashboardVo {
  @ApiProperty({ description: '今日 GMV' })
  todayGMV: number;

  @ApiProperty({ description: '今日订单数' })
  todayOrderCount: number;

  @ApiProperty({ description: '本月 GMV' })
  monthGMV: number;

  @ApiProperty({ description: '待结算佣金' })
  pendingCommission: number;

  @ApiProperty({ description: '已结算佣金' })
  settledCommission: number;

  @ApiProperty({ description: '待审核提现数' })
  pendingWithdrawals: number;
}

/**
 * Store 端佣金统计 VO
 */
export class StoreCommissionStatsVo {
  @ApiProperty({ description: '今日佣金' })
  todayCommission: number;

  @ApiProperty({ description: '本月佣金' })
  monthCommission: number;

  @ApiProperty({ description: '待结算佣金' })
  pendingCommission: number;
}

/**
 * Store 端佣金记录 VO
 */
export class StoreCommissionRecordVo {
  @ApiProperty({ description: '佣金ID' })
  id: string;

  @ApiProperty({ description: '订单ID' })
  orderId: string;

  @ApiPropertyOptional({ description: '订单信息' })
  order?: {
    orderSn: string;
    payAmount?: number;
  };

  @ApiProperty({ description: '受益人ID' })
  beneficiaryId: string;

  @ApiPropertyOptional({ description: '受益人信息' })
  beneficiary?: {
    nickname: string;
    mobile?: string;
    avatar?: string;
  };

  @ApiProperty({ description: '佣金层级', enum: [1, 2] })
  level: 1 | 2;

  @ApiProperty({ description: '佣金金额' })
  amount: number;

  @ApiProperty({ description: '费率快照' })
  rateSnapshot: number;

  @ApiProperty({ description: '佣金状态', enum: CommissionStatus })
  status: string;

  @ApiProperty({ description: '计划结算时间' })
  planSettleTime: string;

  @ApiPropertyOptional({ description: '实际结算时间' })
  actualSettleTime?: string;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiPropertyOptional({ description: '分佣基数类型' })
  commissionBaseType?: string;

  @ApiPropertyOptional({ description: '优惠券抵扣' })
  couponDiscount?: number;

  @ApiPropertyOptional({ description: '积分抵扣' })
  pointsDiscount?: number;

  @ApiPropertyOptional({ description: '是否触发熔断' })
  isCapped?: boolean;
}

/**
 * Store 端流水记录 VO
 */
export class StoreLedgerRecordVo {
  @ApiProperty({ description: '流水ID' })
  id: string;

  @ApiProperty({ description: '流水类型' })
  type: string;

  @ApiProperty({ description: '类型名称' })
  typeName: string;

  @ApiProperty({ description: '金额' })
  amount: number;

  @ApiPropertyOptional({ description: '变动后余额' })
  balanceAfter?: number | null;

  @ApiPropertyOptional({ description: '关联ID' })
  relatedId?: string;

  @ApiPropertyOptional({ description: '备注' })
  remark?: string;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiPropertyOptional({ description: '状态' })
  status?: string | null;

  @ApiPropertyOptional({ description: '用户信息' })
  user?: {
    nickname: string;
    mobile: string;
  };

  @ApiPropertyOptional({ description: '分销信息（仅订单收入类型）' })
  distribution?: {
    referrer?: { nickname: string; mobile: string; amount: number; status?: string };
    indirectReferrer?: { nickname: string; mobile: string; amount: number; status?: string };
  };
}

/**
 * Store 端流水统计 VO
 */
export class StoreLedgerStatsVo {
  @ApiProperty({ description: '总收入' })
  totalIncome: number;

  @ApiProperty({ description: '总支出' })
  totalExpense: number;

  @ApiProperty({ description: '净利润' })
  netProfit: number;

  @ApiProperty({ description: '待结算佣金' })
  pendingCommission: number;
}
