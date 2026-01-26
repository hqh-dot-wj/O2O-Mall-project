import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 购物车商品项 VO
 */
export class CartItemVo {
  @ApiProperty({ description: '购物车ID' })
  id: string;

  @ApiProperty({ description: 'SKU ID' })
  skuId: string;

  @ApiProperty({ description: '商品ID' })
  productId: string;

  @ApiProperty({ description: '商品名称' })
  productName: string;

  @ApiProperty({ description: '商品图片' })
  productImg: string;

  @ApiProperty({ description: '规格数据' })
  specData: Record<string, string> | null;

  @ApiProperty({ description: '加购时价格' })
  addPrice: Decimal;

  @ApiProperty({ description: '当前价格' })
  currentPrice: Decimal;

  @ApiProperty({ description: '价格是否变动' })
  priceChanged: boolean;

  @ApiProperty({ description: '数量' })
  quantity: number;

  @ApiProperty({ description: '库存状态', enum: ['normal', 'insufficient', 'soldOut'] })
  stockStatus: 'normal' | 'insufficient' | 'soldOut';

  @ApiPropertyOptional({ description: '分享人ID' })
  shareUserId?: string;
}

/**
 * 购物车列表响应 VO
 */
export class CartListVo {
  @ApiProperty({ description: '有效商品列表', type: [CartItemVo] })
  items: CartItemVo[];

  @ApiPropertyOptional({ description: '无效商品列表 (已下架等)', type: [CartItemVo] })
  invalidItems?: CartItemVo[];
}
