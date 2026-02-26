import { ApiProperty } from '@nestjs/swagger';

export class ProductConfigVo {
  @ApiProperty({ description: '配置ID' })
  id: number;

  @ApiProperty({ description: '商品ID', required: false })
  productId?: string;

  @ApiProperty({ description: '品类ID', required: false })
  categoryId?: string;

  @ApiProperty({ description: '一级分佣比例 (0-100)', required: false })
  level1Rate?: number;

  @ApiProperty({ description: '二级分佣比例 (0-100)', required: false })
  level2Rate?: number;

  @ApiProperty({ description: '佣金基数类型', required: false })
  commissionBaseType?: string;

  @ApiProperty({ description: '是否启用' })
  isActive: boolean;

  @ApiProperty({ description: '创建人' })
  createBy: string;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新人' })
  updateBy: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}
