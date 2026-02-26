import { ApiProperty } from '@nestjs/swagger';

export class ConditionResultVo {
  @ApiProperty({ description: '字段名' })
  field: string;

  @ApiProperty({ description: '要求值' })
  required: number;

  @ApiProperty({ description: '实际值' })
  actual: number;

  @ApiProperty({ description: '是否通过' })
  passed: boolean;
}

export class LevelCheckVo {
  @ApiProperty({ description: '当前等级' })
  currentLevel: number;

  @ApiProperty({ description: '可升级到的等级' })
  eligibleLevel: number;

  @ApiProperty({ description: '是否满足升级条件' })
  canUpgrade: boolean;

  @ApiProperty({ description: '升级条件检查结果', type: [ConditionResultVo] })
  conditionResults: ConditionResultVo[];
}
