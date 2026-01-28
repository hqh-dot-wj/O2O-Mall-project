import { ApiProperty } from '@nestjs/swagger';

/**
 * 分类视图对象（VO）
 * 用于返回商品分类信息给前端，支持树形结构
 */
export class CategoryVo {
  /** 分类ID */
  @ApiProperty({ description: '分类ID', example: 1 })
  catId: number;

  /** 父级分类ID，0或null表示顶级分类 */
  @ApiProperty({ description: '父级分类ID', example: 0 })
  parentId: number;

  /** 分类名称 */
  @ApiProperty({ description: '分类名称', example: '电子产品' })
  name: string;

  /** 分类图标 */
  @ApiProperty({ description: '分类图标', example: 'icon-electronics' })
  icon: string;

  /** 排序号 */
  @ApiProperty({ description: '排序', example: 0 })
  sort: number;

  /** 关联的属性模板ID */
  @ApiProperty({ description: '属性模板ID', example: 1 })
  attrTemplateId: number;

  /** 创建时间 */
  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  createTime: Date;

  /** 更新时间 */
  @ApiProperty({ description: '更新时间', example: '2024-01-01T00:00:00.000Z' })
  updateTime: Date;

  /** 子分类列表，用于构建树形结构 */
  @ApiProperty({ description: '子分类列表', type: () => [CategoryVo], required: false })
  children?: CategoryVo[];
}
