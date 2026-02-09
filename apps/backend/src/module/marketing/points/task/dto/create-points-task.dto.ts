import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/**
 * 创建积分任务 DTO
 * 
 * @description 用于创建积分任务配置
 */
export class CreatePointsTaskDto {
  @ApiProperty({ description: '任务唯一标识', example: 'COMPLETE_PROFILE' })
  @IsNotEmpty()
  @IsString()
  taskKey: string;

  @ApiProperty({ description: '任务名称', example: '完善个人资料' })
  @IsNotEmpty()
  @IsString()
  taskName: string;

  @ApiProperty({ description: '任务描述', required: false })
  @IsOptional()
  @IsString()
  taskDescription?: string;

  @ApiProperty({ description: '积分奖励', example: 50 })
  @IsInt()
  @Min(1)
  pointsReward: number;

  @ApiProperty({ description: '完成条件（JSON格式）', example: {} })
  @IsOptional()
  completionCondition?: any;

  @ApiProperty({ description: '是否可重复完成', example: false })
  @IsOptional()
  @IsBoolean()
  isRepeatable?: boolean;

  @ApiProperty({ description: '最多完成次数', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxCompletions?: number;

  @ApiProperty({ description: '是否启用', example: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
