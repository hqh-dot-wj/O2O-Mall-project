import { ApiProperty } from '@nestjs/swagger';
import { UpgradeCondition } from '../dto/create-level.dto';

export class LevelVo {
  @ApiProperty({ description: '主键ID' })
  id: number;

  @ApiProperty({ description: '租户ID' })
  tenantId: string;

  @ApiProperty({ description: '等级编号' })
  levelId: number;

  @ApiProperty({ description: '等级名称' })
  levelName: string;

  @ApiProperty({ description: '等级图标URL', required: false })
  levelIcon?: string;

  @ApiProperty({ description: '一级佣金比例' })
  level1Rate: string;

  @ApiProperty({ description: '二级佣金比例' })
  level2Rate: string;

  @ApiProperty({ description: '升级条件', required: false })
  upgradeCondition?: UpgradeCondition;

  @ApiProperty({ description: '保级条件', required: false })
  maintainCondition?: UpgradeCondition;

  @ApiProperty({ description: '等级权益描述', required: false })
  benefits?: string;

  @ApiProperty({ description: '排序' })
  sort: number;

  @ApiProperty({ description: '是否激活' })
  isActive: boolean;

  @ApiProperty({ description: '创建人' })
  createBy: string;

  @ApiProperty({ description: '创建时间' })
  createTime: Date;

  @ApiProperty({ description: '更新人' })
  updateBy: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: Date;
}

export class MemberLevelLogVo {
  @ApiProperty({ description: '主键ID' })
  id: number;

  @ApiProperty({ description: '租户ID' })
  tenantId: string;

  @ApiProperty({ description: '会员ID' })
  memberId: string;

  @ApiProperty({ description: '原等级' })
  fromLevel: number;

  @ApiProperty({ description: '目标等级' })
  toLevel: number;

  @ApiProperty({ description: '变更类型' })
  changeType: string;

  @ApiProperty({ description: '变更原因', required: false })
  reason?: string;

  @ApiProperty({ description: '操作人', required: false })
  operator?: string;

  @ApiProperty({ description: '创建时间' })
  createTime: Date;
}
