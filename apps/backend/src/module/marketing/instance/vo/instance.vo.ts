import { ApiProperty } from '@nestjs/swagger';
import { PlayInstanceStatus } from '@prisma/client';

export class PlayInstanceVo {
  @ApiProperty({ description: '记录ID' })
  id: string;

  @ApiProperty({ description: '租户ID' })
  tenantId: string;

  @ApiProperty({ description: '会员ID' })
  memberId: string;

  @ApiProperty({ description: '关联配置ID' })
  configId: string;

  @ApiProperty({ description: '玩法模板编码' })
  templateCode: string;

  @ApiProperty({ description: '订单号' })
  orderSn?: string;

  @ApiProperty({ description: '实例动态数据' })
  instanceData: any;

  @ApiProperty({ description: '状态', enum: PlayInstanceStatus })
  status: PlayInstanceStatus;

  @ApiProperty({ description: '前端显示数据 (增强字段)' })
  displayData?: any;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}

export class PlayInstanceListVo {
  @ApiProperty({ description: '实例列表', type: [PlayInstanceVo] })
  rows: PlayInstanceVo[];

  @ApiProperty({ description: '总条数' })
  total: number;
}
