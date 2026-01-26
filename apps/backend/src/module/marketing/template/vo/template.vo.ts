import { ApiProperty } from '@nestjs/swagger';

export class PlayTemplateVo {
  @ApiProperty({ description: '模板ID' })
  id: string;

  @ApiProperty({ description: '模板名称' })
  name: string;

  @ApiProperty({ description: '模板唯一标识' })
  code: string;

  @ApiProperty({ description: '单位名称' })
  unitName: string;

  @ApiProperty({ description: '规则Schema配置' })
  ruleSchema: any;

  @ApiProperty({ description: '前端组件ID' })
  uiComponentId: string;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}

export class PlayTemplateListVo {
  @ApiProperty({ description: '模板列表', type: [PlayTemplateVo] })
  rows: PlayTemplateVo[];

  @ApiProperty({ description: '总条数' })
  total: number;
}
