import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Store 端订单列表项 VO
 */
export class StoreOrderListItemVo {
  @ApiProperty({ description: '订单ID' })
  id: string;

  @ApiProperty({ description: '订单号' })
  orderSn: string;

  @ApiProperty({ description: '订单类型', enum: ['PRODUCT', 'SERVICE'] })
  orderType: string;

  @ApiProperty({ description: '订单状态' })
  status: string;

  @ApiProperty({ description: '收货人' })
  receiverName: string;

  @ApiProperty({ description: '收货人电话' })
  receiverPhone: string;

  @ApiProperty({ description: '收货地址' })
  receiverAddress: string;

  @ApiProperty({ description: '商品总金额' })
  totalAmount: number;

  @ApiProperty({ description: '运费' })
  freightAmount: number;

  @ApiProperty({ description: '优惠金额' })
  discountAmount: number;

  @ApiProperty({ description: '实付金额' })
  payAmount: number;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '商品主图' })
  productImg: string;

  @ApiProperty({ description: '佣金金额' })
  commissionAmount: number;

  @ApiProperty({ description: '商户收款金额' })
  remainingAmount: number;

  @ApiProperty({ description: '所属租户' })
  tenantName: string;
}

/**
 * Store 端订单商品项 VO
 */
export class StoreOrderItemVo {
  @ApiProperty()
  id: string | number;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  productImg: string;

  @ApiProperty()
  skuId: string;

  @ApiProperty()
  specData: Record<string, string>;

  @ApiProperty()
  price: number;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  totalAmount: number;
}

/**
 * Store 端订单详情中客户信息
 */
export class StoreOrderCustomerVo {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  mobile: string;

  @ApiPropertyOptional()
  avatar?: string;
}

/**
 * Store 端订单详情中技师信息
 */
export class StoreOrderWorkerVo {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional()
  avatar?: string;

  @ApiPropertyOptional()
  rating?: number;
}

/**
 * Store 端订单详情中佣金明细
 */
export class StoreOrderCommissionVo {
  @ApiProperty()
  id: string;

  @ApiProperty()
  beneficiaryId: string;

  @ApiPropertyOptional()
  beneficiary?: { nickname: string; avatar?: string };

  @ApiProperty()
  level: 1 | 2;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  rateSnapshot: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  planSettleTime: string;
}

/**
 * Store 端订单详情 VO
 */
export class StoreOrderDetailVo {
  @ApiProperty({ description: '订单信息', type: StoreOrderListItemVo })
  order: StoreOrderListItemVo & { items: StoreOrderItemVo[]; remark?: string; bookingTime?: string };

  @ApiPropertyOptional({ description: '客户信息', type: StoreOrderCustomerVo })
  customer?: StoreOrderCustomerVo;

  @ApiPropertyOptional({ description: '技师信息', type: StoreOrderWorkerVo })
  worker?: StoreOrderWorkerVo;

  @ApiPropertyOptional({ description: '归因信息' })
  attribution?: { shareUser?: { id: string; nickname: string }; referrer?: { id: string; nickname: string } };

  @ApiPropertyOptional({ description: '佣金明细', type: [StoreOrderCommissionVo] })
  commissions?: StoreOrderCommissionVo[];

  @ApiPropertyOptional({ description: '商户信息' })
  business?: { tenantId?: string; companyName?: string; remainingAmount?: string; totalCommissionAmount?: string };
}
