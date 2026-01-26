import { ApiProperty } from '@nestjs/swagger';

/**
 * C端商品列表项VO
 */
export class ClientProductVo {
  @ApiProperty({ description: '商品ID' })
  productId: string;

  @ApiProperty({ description: '商品名称' })
  name: string;

  @ApiProperty({ description: '商品副标题' })
  subTitle?: string;

  @ApiProperty({ description: '商品主图', isArray: true, type: String })
  mainImages: string[];

  @ApiProperty({ description: '商品封面图' })
  coverImage?: string;

  @ApiProperty({ description: '商品类型: REAL-实物, SERVICE-服务' })
  type: string;

  @ApiProperty({ description: '价格' })
  price: number;

  @ApiProperty({ description: '分类ID' })
  categoryId: number;

  @ApiProperty({ description: '分类名称' })
  categoryName?: string;
}

/**
 * C端商品详情VO
 */
export class ClientProductDetailVo extends ClientProductVo {
  @ApiProperty({ description: '详情页HTML' })
  detailHtml?: string;

  @ApiProperty({ description: '是否包邮' })
  isFreeShip?: boolean;

  @ApiProperty({ description: '服务时长(分钟)' })
  serviceDuration?: number;

  @ApiProperty({ description: '服务半径(km)' })
  serviceRadius?: number;

  @ApiProperty({ description: '是否需要预约' })
  needBooking?: boolean;

  @ApiProperty({ description: 'SKU列表' })
  skus?: ClientSkuVo[];
}

/**
 * C端SKU VO
 */
export class ClientSkuVo {
  @ApiProperty({ description: 'SKU ID' })
  skuId: string;

  @ApiProperty({ description: '规格值', type: 'object', additionalProperties: true })
  specValues: Record<string, string>;

  @ApiProperty({ description: 'SKU图片' })
  skuImage?: string;

  @ApiProperty({ description: '价格' })
  price: number;
}
