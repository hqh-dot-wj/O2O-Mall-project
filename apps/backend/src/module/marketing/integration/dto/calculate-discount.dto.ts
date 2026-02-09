import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

/**
 * 订单商品 DTO
 */
export class OrderItemDto {
  @ApiProperty({ description: '商品ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: '商品名称' })
  @IsString()
  productName: string;

  @ApiProperty({ description: '商品价格' })
  @IsInt()
  @Min(0)
  price: number;

  @ApiProperty({ description: '购买数量' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: '分类ID', required: false })
  @IsOptional()
  @IsInt()
  categoryId?: number;
}

/**
 * 计算订单优惠 DTO
 * 
 * @description 用于计算订单的优惠券和积分抵扣
 */
export class CalculateDiscountDto {
  @ApiProperty({ description: '订单商品列表', type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ description: '用户优惠券ID', required: false })
  @IsOptional()
  @IsString()
  userCouponId?: string;

  @ApiProperty({ description: '使用积分数量', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  pointsUsed?: number;
}
