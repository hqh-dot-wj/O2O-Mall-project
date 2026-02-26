import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, IsNumber, Min, Max, Length, IsBoolean } from 'class-validator';

/**
 * 升级条件接口
 */
export interface UpgradeCondition {
  type: 'AND' | 'OR'; // 条件关系
  rules: Array<{
    field: 'totalCommission' | 'recentCommission' | 'totalOrders' | 'recentOrders' | 'directReferrals' | 'teamSize';
    operator: '>=' | '>' | '=' | '<' | '<=';
    value: number;
    days?: number; // 用于 recent* 类型
  }>;
}

export class CreateLevelDto {
  @ApiProperty({ description: '等级编号（1-10）' })
  @IsInt()
  @Min(1)
  @Max(10)
  levelId: number;

  @ApiProperty({ description: '等级名称' })
  @IsString()
  @Length(1, 50)
  levelName: string;

  @ApiProperty({ description: '等级图标URL', required: false })
  @IsOptional()
  @IsString()
  levelIcon?: string;

  @ApiProperty({ description: '一级佣金比例（0-100）' })
  @IsNumber()
  @Min(0)
  @Max(100)
  level1Rate: number;

  @ApiProperty({ description: '二级佣金比例（0-100）' })
  @IsNumber()
  @Min(0)
  @Max(100)
  level2Rate: number;

  @ApiProperty({ description: '升级条件', required: false, type: 'object' })
  @IsOptional()
  upgradeCondition?: UpgradeCondition;

  @ApiProperty({ description: '保级条件', required: false, type: 'object' })
  @IsOptional()
  maintainCondition?: UpgradeCondition;

  @ApiProperty({ description: '等级权益描述', required: false })
  @IsOptional()
  @IsString()
  benefits?: string;

  @ApiProperty({ description: '排序', required: false })
  @IsOptional()
  @IsInt()
  sort?: number;

  @ApiProperty({ description: '是否激活', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
