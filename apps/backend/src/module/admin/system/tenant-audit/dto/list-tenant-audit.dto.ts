import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { PageQueryDto } from 'src/common/dto/base.dto';

/**
 * 租户审计日志查询 DTO
 */
export class ListTenantAuditDto extends PageQueryDto {
  @ApiProperty({ description: '用户ID', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 64)
  userId?: string;

  @ApiProperty({ description: '用户名', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  userName?: string;

  @ApiProperty({ description: '请求租户ID', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 20)
  requestTenantId?: string;

  @ApiProperty({ description: '访问租户ID', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 20)
  accessTenantId?: string;

  @ApiProperty({ description: '模型名称', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  modelName?: string;

  @ApiProperty({ description: '操作类型', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 20)
  operation?: string;

  @ApiProperty({ description: '是否跨租户访问', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isCrossTenant?: boolean;

  @ApiProperty({ description: '是否超级管理员', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isSuperTenant?: boolean;

  @ApiProperty({ description: '是否忽略租户', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isIgnoreTenant?: boolean;

  @ApiProperty({ description: '开始时间', required: false })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiProperty({ description: '结束时间', required: false })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiProperty({ description: '状态', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 20)
  status?: string;
}
