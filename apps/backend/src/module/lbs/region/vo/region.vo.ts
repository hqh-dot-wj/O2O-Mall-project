import { ApiProperty } from '@nestjs/swagger';

export class RegionVo {
  @ApiProperty({ description: '行政区划编码' })
  code: string;

  @ApiProperty({ description: '行政区划名称' })
  name: string;

  @ApiProperty({ description: '父级编码' })
  parentId: string;

  @ApiProperty({ description: '层级' })
  level: number;

  @ApiProperty({ description: '拼音' })
  pinyin: string;

  @ApiProperty({ description: '子节点', type: [RegionVo], required: false })
  children?: RegionVo[];
}
