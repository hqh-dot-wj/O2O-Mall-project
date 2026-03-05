import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PublishStatus } from '@prisma/client';

/**
 * 更新商品发布状态 DTO
 */
export class UpdateProductStatusDto {
  @ApiProperty({ description: '发布状态', enum: PublishStatus })
  @IsEnum(PublishStatus)
  publishStatus: string;
}
