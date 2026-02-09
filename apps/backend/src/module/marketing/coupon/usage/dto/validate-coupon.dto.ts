import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 验证优惠券 DTO
 */
export class ValidateCouponDto {
  @ApiProperty({ description: '用户优惠券ID' })
  @IsNotEmpty({ message: '用户优惠券ID不能为空' })
  @IsUUID('4', { message: '用户优惠券ID格式不正确' })
  userCouponId: string;

  @ApiProperty({ description: '订单金额' })
  @IsNotEmpty({ message: '订单金额不能为空' })
  @IsNumber({}, { message: '订单金额必须是数字' })
  @Min(0, { message: '订单金额不能为负数' })
  @Type(() => Number)
  orderAmount: number;

  @ApiProperty({ description: '商品ID列表', type: [String], required: false })
  productIds?: string[];

  @ApiProperty({ description: '分类ID列表', type: [Number], required: false })
  categoryIds?: number[];
}

/**
 * 订单上下文（用于优惠券验证）
 */
export class OrderContext {
  @ApiProperty({ description: '用户ID' })
  memberId: string;

  @ApiProperty({ description: '订单金额' })
  orderAmount: number;

  @ApiProperty({ description: '商品ID列表', type: [String], required: false })
  productIds?: string[];

  @ApiProperty({ description: '分类ID列表', type: [Number], required: false })
  categoryIds?: number[];
}
