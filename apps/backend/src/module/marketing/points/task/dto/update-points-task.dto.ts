import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * 更新积分任务 DTO
 * 
 * @description 用于更新积分任务配置
 */
export class UpdatePointsTaskDto {
  @ApiProperty({ description: '任务名称', required: false })
  @IsOptional()
  @IsString()
  taskName?: string;

  @ApiProperty({ description: '任务描述', required: false })
  @IsOptional()
  @IsString()
  taskDescription?: string;

  @ApiProperty({ description: '积分奖励', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  pointsReward?: number;

  @ApiProperty({ description: '完成条件（JSON格式）', required: false })
  @IsOptional()
  completionCondition?: any;

  @ApiProperty({ description: '是否可重复完成', required: false })
  @IsOptional()
  @IsBoolean()
  isRepeatable?: boolean;

  @ApiProperty({ description: '最多完成次数', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxCompletions?: number;

  @ApiProperty({ description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
