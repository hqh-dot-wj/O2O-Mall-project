import { ApiProperty } from '@nestjs/swagger';

/**
 * 积分任务 VO
 * 
 * @description 积分任务的视图对象
 */
export class PointsTaskVo {
  @ApiProperty({ description: '任务ID' })
  id: string;

  @ApiProperty({ description: '租户ID' })
  tenantId: string;

  @ApiProperty({ description: '任务唯一标识' })
  taskKey: string;

  @ApiProperty({ description: '任务名称' })
  taskName: string;

  @ApiProperty({ description: '任务描述' })
  taskDescription: string | null;

  @ApiProperty({ description: '积分奖励' })
  pointsReward: number;

  @ApiProperty({ description: '完成条件' })
  completionCondition: any;

  @ApiProperty({ description: '是否可重复完成' })
  isRepeatable: boolean;

  @ApiProperty({ description: '最多完成次数' })
  maxCompletions: number | null;

  @ApiProperty({ description: '是否启用' })
  isEnabled: boolean;

  @ApiProperty({ description: '创建人' })
  createBy: string;

  @ApiProperty({ description: '创建时间' })
  createTime: Date;

  @ApiProperty({ description: '更新人' })
  updateBy: string | null;

  @ApiProperty({ description: '更新时间' })
  updateTime: Date;
}

/**
 * 任务完成记录 VO
 * 
 * @description 用户任务完成记录的视图对象
 */
export class TaskCompletionVo {
  @ApiProperty({ description: '记录ID' })
  id: string;

  @ApiProperty({ description: '任务ID' })
  taskId: string;

  @ApiProperty({ description: '任务名称' })
  taskName: string;

  @ApiProperty({ description: '完成时间' })
  completionTime: Date;

  @ApiProperty({ description: '获得积分' })
  pointsAwarded: number;
}
