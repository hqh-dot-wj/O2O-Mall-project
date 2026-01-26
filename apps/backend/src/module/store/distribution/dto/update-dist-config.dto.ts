import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean, Min, Max, IsOptional } from 'class-validator';

export class UpdateDistConfigDto {
  @ApiProperty({ description: '一级分佣比例 (0-100)', example: 60 })
  @IsNumber()
  @Min(0)
  @Max(100)
  level1Rate: number;

  @ApiProperty({ description: '二级分佣比例 (0-100)', example: 40 })
  @IsNumber()
  @Min(0)
  @Max(100)
  level2Rate: number;

  @ApiProperty({ description: '是否允许普通用户分销', example: true })
  @IsBoolean()
  enableLV0: boolean;

  // === 跨店分销配置 ===
  @ApiProperty({ description: '是否允许外店推荐人获取佣金', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  enableCrossTenant?: boolean;

  @ApiProperty({ description: '跨店分佣折扣 (0-100, 100=不打折)', example: 80, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  crossTenantRate?: number;

  @ApiProperty({ description: '跨店佣金日限额 (元)', example: 500, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  crossMaxDaily?: number;
}
