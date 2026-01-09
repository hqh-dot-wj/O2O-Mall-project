import { ApiProperty } from '@nestjs/swagger';

/**
 * 部门树节点（公共 VO）
 */
export class DeptTreeNodeVo {
  @ApiProperty({ description: '部门ID' })
  id: number;

  @ApiProperty({ description: '部门名称' })
  label: string;

  @ApiProperty({ description: '子节点列表', type: [DeptTreeNodeVo], required: false })
  children?: DeptTreeNodeVo[];
}
