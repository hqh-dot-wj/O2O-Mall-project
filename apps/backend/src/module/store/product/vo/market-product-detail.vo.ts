import { ApiProperty } from '@nestjs/swagger';
import { DistributionMode } from '@prisma/client';
import { MarketProductVo } from './market-product.vo';
import { Type } from 'class-transformer';

export class GlobalSkuVo {
  @ApiProperty({ description: '全局SKU ID' })
  skuId: string;

  @ApiProperty({ description: '关联产品ID' })
  productId: string;

  @ApiProperty({ description: '规格值JSON' })
  specValues: any;

  @ApiProperty({ description: '图片' })
  skuImage: string;

  @ApiProperty({ description: '指导价格' })
  guidePrice: number;

  @ApiProperty({ description: '指导分销比例' })
  guideRate: number;

  @ApiProperty({ description: '分销模式' })
  distMode: DistributionMode;

  @ApiProperty({ description: '成本价' })
  costPrice: number;
}

export class MarketProductDetailVo extends MarketProductVo {
  @ApiProperty({ description: '全局SKU列表', type: [GlobalSkuVo] })
  @Type(() => GlobalSkuVo)
  globalSkus: GlobalSkuVo[];

  @ApiProperty({ description: '服务半径' })
  serviceRadius?: number;
}
