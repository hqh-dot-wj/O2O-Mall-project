import { ApiProperty } from '@nestjs/swagger';
import { SpecValues } from 'src/common/types';

export class StockVo {
  @ApiProperty({ description: 'SKU ID' })
  id: string;

  @ApiProperty({ description: '商品名称' })
  productName: string;

  @ApiProperty({ description: 'SKU编码' })
  skuCode: string;

  @ApiProperty({ description: '当前库存' })
  stock: number;

  @ApiProperty({ 
    description: '规格信息',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { '颜色': '红色', '尺寸': 'XL' }
  })
  specs: SpecValues;
}
