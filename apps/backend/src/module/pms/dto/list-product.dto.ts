import { PageQueryDto } from 'src/common/dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PublishStatus } from '@prisma/client';

/** 将字典值 '0'/'1' 转为 PublishStatus，兼容前端 dict 与直接传枚举 */
function toPublishStatus(v: unknown): PublishStatus | undefined {
  if (v === 'OFF_SHELF' || v === 'ON_SHELF') return v;
  if (v === '0') return PublishStatus.OFF_SHELF;
  if (v === '1') return PublishStatus.ON_SHELF;
  return undefined;
}

export class ListProductDto extends PageQueryDto {
  @ApiProperty({ description: '商品名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '分类ID', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;

  @ApiProperty({ description: '发布状态', enum: PublishStatus, required: false })
  @IsOptional()
  @Transform(({ value }) => toPublishStatus(value) ?? value)
  @IsEnum(PublishStatus)
  publishStatus?: PublishStatus;
}
