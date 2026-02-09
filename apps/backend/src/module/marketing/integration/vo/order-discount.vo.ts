import { ApiProperty } from '@nestjs/swagger';

/**
 * 订单优惠结果 VO
 * 
 * @description 订单优惠计算结果的视图对象
 */
export class OrderDiscountVo {
  @ApiProperty({ description: '订单原价' })
  originalAmount: number;

  @ApiProperty({ description: '优惠券抵扣金额' })
  couponDiscount: number;

  @ApiProperty({ description: '积分抵扣金额' })
  pointsDiscount: number;

  @ApiProperty({ description: '总优惠金额' })
  totalDiscount: number;

  @ApiProperty({ description: '最终应付金额' })
  finalAmount: number;

  @ApiProperty({ description: '使用的优惠券ID' })
  userCouponId: string | null;

  @ApiProperty({ description: '使用的积分数量' })
  pointsUsed: number;

  @ApiProperty({ description: '优惠券名称' })
  couponName: string | null;
}
