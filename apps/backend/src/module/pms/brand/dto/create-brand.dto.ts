import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 创建品牌DTO
 * 用于接收创建品牌的请求参数
 */
export class CreateBrandDto {
  /** 品牌名称 */
  @ApiProperty({ description: '品牌名称', example: '苹果' })
  @IsString({ message: '品牌名称必须是字符串' })
  @IsNotEmpty({ message: '品牌名称不能为空' })
  name: string;

  /** 品牌Logo URL */
  @ApiProperty({ description: '品牌Logo', required: false, example: 'https://example.com/logo.png' })
  @IsString({ message: '品牌Logo必须是字符串' })
  @IsOptional()
  logo?: string;

  /** 排序号，数字越小越靠前 */
  @ApiProperty({ description: '排序', required: false, default: 0, example: 0 })
  @Type(() => Number)
  @IsInt({ message: '排序必须是整数' })
  @Min(0, { message: '排序不能小于0' })
  @IsOptional()
  sort?: number;
}
