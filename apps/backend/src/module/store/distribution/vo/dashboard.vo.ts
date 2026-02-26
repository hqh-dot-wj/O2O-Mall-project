import { ApiProperty } from '@nestjs/swagger';

export class DistributorStatsVo {
  @ApiProperty({ description: '总分销员数' })
  total: number;

  @ApiProperty({ description: '新增分销员数（时间范围内）' })
  newCount: number;

  @ApiProperty({ description: '活跃分销员数（时间范围内有佣金记录）' })
  activeCount: number;
}

export class OrderStatsVo {
  @ApiProperty({ description: '分销订单总数' })
  totalCount: number;

  @ApiProperty({ description: '分销订单总金额' })
  totalAmount: number;

  @ApiProperty({ description: '分销订单占比（%）' })
  percentage: number;
}

export class CommissionTrendItemVo {
  @ApiProperty({ description: '日期' })
  date: string;

  @ApiProperty({ description: '佣金金额' })
  amount: number;
}

export class CommissionStatsVo {
  @ApiProperty({ description: '佣金支出总额' })
  totalAmount: number;

  @ApiProperty({ description: '待结算佣金' })
  pendingAmount: number;

  @ApiProperty({ description: '已结算佣金' })
  settledAmount: number;

  @ApiProperty({ description: '佣金趋势（按日）', type: [CommissionTrendItemVo] })
  trend: CommissionTrendItemVo[];
}

export class DashboardVo {
  @ApiProperty({ description: '分销员统计', type: DistributorStatsVo })
  distributorStats: DistributorStatsVo;

  @ApiProperty({ description: '订单统计', type: OrderStatsVo })
  orderStats: OrderStatsVo;

  @ApiProperty({ description: '佣金统计', type: CommissionStatsVo })
  commissionStats: CommissionStatsVo;
}
