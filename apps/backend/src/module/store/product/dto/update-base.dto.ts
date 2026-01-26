import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { PublishStatus } from '@prisma/client';

export class UpdateProductBaseDto {
  @ApiProperty({ description: '店铺商品ID (SPU ID)' })
  @IsString()
  id: string;

  @ApiProperty({ description: '上架状态', enum: PublishStatus })
  @IsEnum(PublishStatus)
  status: PublishStatus;

  @ApiProperty({ description: '门店自定义标题', required: false })
  @IsOptional()
  @IsString()
  customTitle?: string;

  @ApiProperty({ description: '服务半径', required: false })
  @IsOptional()
  @IsNumber()
  overrideRadius?: number;
}
