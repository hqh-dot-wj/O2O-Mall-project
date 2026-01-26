import { ApiProperty } from '@nestjs/swagger';
import { PlayInstanceStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';
import { PageQueryDto } from 'src/common/dto/base.dto';

/**
 * 营销实例基础 DTO
 */
export class PlayInstanceDto {
  @ApiProperty({ description: '租户ID' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ description: '会员ID' })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({ description: '关联配置ID' })
  @IsString()
  @IsNotEmpty()
  configId: string;

  @ApiProperty({ description: '玩法模板编码' })
  @IsString()
  @IsNotEmpty()
  templateCode: string;

  @ApiProperty({ description: '订单号', required: false })
  @IsOptional()
  @IsString()
  orderSn?: string;

  @ApiProperty({ description: '实例动态数据' })
  @IsObject()
  @IsNotEmpty()
  instanceData: Record<string, any>;

  @ApiProperty({ description: '状态', enum: PlayInstanceStatus })
  @IsEnum(PlayInstanceStatus)
  @IsOptional()
  status?: PlayInstanceStatus;
}

/**
 * 创建营销实例 DTO
 */
export class CreatePlayInstanceDto extends PlayInstanceDto {}

/**
 * 更新营销实例 DTO
 */
export class UpdatePlayInstanceDto extends PartialType(PlayInstanceDto) {}

/**
 * 分页查询实例 DTO
 */
export class ListPlayInstanceDto extends PageQueryDto {
  @ApiProperty({ description: '租户ID', required: false })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiProperty({ description: '会员ID', required: false })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiProperty({ description: '状态', enum: PlayInstanceStatus, required: false })
  @IsOptional()
  @IsEnum(PlayInstanceStatus)
  status?: PlayInstanceStatus;
}

// 辅助函数，因为 PartialType 可能没导入
function PartialType<T>(classRef: new () => T): new () => Partial<T> {
  return classRef as any;
}
