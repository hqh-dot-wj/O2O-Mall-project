import { ApiProperty } from '@nestjs/swagger';
import { ProductType, PublishStatus } from '@prisma/client';

export class MarketProductVo {
  @ApiProperty({ description: '商品ID' })
  productId: string;

  @ApiProperty({ description: '商品名称' })
  name: string;

  @ApiProperty({ description: '商品主图', type: String })
  albumPics: string;

  @ApiProperty({ description: '商品类型', enum: ProductType })
  type: ProductType;

  @ApiProperty({ description: '是否有SKU', deprecated: true })
  hasSku: boolean;

  @ApiProperty({ description: '价格(起)' })
  price: number;

  @ApiProperty({ description: '是否已引入' })
  isImported: boolean;
}
