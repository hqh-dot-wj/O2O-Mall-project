import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 订单商品项 VO
 */
export class OrderItemVo {
  @ApiProperty({ description: '商品ID' })
  productId: string;

  @ApiProperty({ description: '商品名称' })
  productName: string;

  @ApiProperty({ description: '商品图片' })
  productImg: string;

  @ApiProperty({ description: 'SKU ID' })
  skuId: string;

  @ApiProperty({ description: '规格数据' })
  specData: Record<string, string> | null;

  @ApiProperty({ description: '单价' })
  price: number;

  @ApiProperty({ description: '数量' })
  quantity: number;

  @ApiProperty({ description: '小计' })
  totalAmount: number;
}

/**
 * 订单详情 VO
 */
export class OrderDetailVo {
  @ApiProperty({ description: '订单ID' })
  id: string;

  @ApiProperty({ description: '订单编号' })
  orderSn: string;

  @ApiProperty({ description: '订单状态' })
  status: string;

  @ApiProperty({ description: '支付状态' })
  payStatus: string;

  @ApiProperty({ description: '订单类型' })
  orderType: string;

  @ApiProperty({ description: '商品总额' })
  totalAmount: number;

  @ApiProperty({ description: '运费' })
  freightAmount: number;

  @ApiProperty({ description: '优惠金额' })
  discountAmount: number;

  @ApiProperty({ description: '应付金额' })
  payAmount: number;

  @ApiPropertyOptional({ description: '收货人' })
  receiverName?: string;

  @ApiPropertyOptional({ description: '收货电话' })
  receiverPhone?: string;

  @ApiPropertyOptional({ description: '收货地址' })
  receiverAddress?: string;

  @ApiPropertyOptional({ description: '预约时间' })
  bookingTime?: Date;

  @ApiPropertyOptional({ description: '服务备注' })
  serviceRemark?: string;

  @ApiPropertyOptional({ description: '支付时间' })
  payTime?: Date;

  @ApiProperty({ description: '创建时间' })
  createTime: Date;

  @ApiProperty({ description: '订单商品', type: [OrderItemVo] })
  items: OrderItemVo[];
}

/**
 * 订单列表项 VO
 */
export class OrderListItemVo {
  @ApiProperty({ description: '订单ID' })
  id: string;

  @ApiProperty({ description: '订单编号' })
  orderSn: string;

  @ApiProperty({ description: '订单状态' })
  status: string;

  @ApiProperty({ description: '应付金额' })
  payAmount: number;

  @ApiProperty({ description: '商品数量' })
  itemCount: number;

  @ApiProperty({ description: '首个商品图片' })
  coverImage: string;

  @ApiProperty({ description: '首个商品名称' })
  productName: string;

  @ApiProperty({ description: '创建时间' })
  createTime: Date;
}

/**
 * 结算预览 VO
 */
export class CheckoutPreviewVo {
  @ApiProperty({ description: '商品列表', type: [OrderItemVo] })
  items: OrderItemVo[];

  @ApiProperty({ description: '商品总额' })
  totalAmount: number;

  @ApiProperty({ description: '运费' })
  freightAmount: number;

  @ApiProperty({ description: '优惠金额' })
  discountAmount: number;

  @ApiProperty({ description: '应付金额' })
  payAmount: number;

  @ApiPropertyOptional({ description: '默认收货地址' })
  defaultAddress?: {
    name: string;
    phone: string;
    address: string;
    lat?: number;
    lng?: number;
  };

  @ApiProperty({ description: '是否包含服务商品' })
  hasService: boolean;

  @ApiProperty({ description: '是否超出服务范围' })
  outOfRange?: boolean;
}
