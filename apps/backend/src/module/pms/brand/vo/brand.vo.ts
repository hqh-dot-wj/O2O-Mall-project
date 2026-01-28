import { ApiProperty } from '@nestjs/swagger';

/**
 * 品牌视图对象（VO）
 * 用于返回品牌信息给前端
 */
export class BrandVo {
  /** 品牌ID */
  @ApiProperty({ description: '品牌ID', example: 1 })
  brandId: number;

  /** 品牌名称 */
  @ApiProperty({ description: '品牌名称', example: '苹果' })
  name: string;

  /** 品牌Logo URL */
  @ApiProperty({ description: '品牌Logo', example: 'https://example.com/logo.png' })
  logo: string;

  /** 排序号 */
  @ApiProperty({ description: '排序', example: 0 })
  sort: number;

  /** 创建时间 */
  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  createTime: Date;

  /** 更新时间 */
  @ApiProperty({ description: '更新时间', example: '2024-01-01T00:00:00.000Z' })
  updateTime: Date;
}
