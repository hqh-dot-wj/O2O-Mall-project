import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 创建分类DTO
 * 用于接收创建商品分类的请求参数
 */
export class CreateCategoryDto {
  /** 父级分类ID，0或null表示顶级分类 */
  @ApiProperty({ description: '父级分类ID', required: false, default: 0, example: 0 })
  @Type(() => Number)
  @IsInt({ message: '父级分类ID必须是整数' })
  @Min(0, { message: '父级分类ID不能小于0' })
  @IsOptional()
  parentId?: number;

  /** 分类名称 */
  @ApiProperty({ description: '分类名称', example: '电子产品' })
  @IsString({ message: '分类名称必须是字符串' })
  @IsNotEmpty({ message: '分类名称不能为空' })
  name: string;

  /** 分类图标URL或图标类名 */
  @ApiProperty({ description: '分类图标', required: false, example: 'icon-electronics' })
  @IsString({ message: '分类图标必须是字符串' })
  @IsOptional()
  icon?: string;

  /** 排序号，数字越小越靠前 */
  @ApiProperty({ description: '排序', required: false, default: 0, example: 0 })
  @Type(() => Number)
  @IsInt({ message: '排序必须是整数' })
  @Min(0, { message: '排序不能小于0' })
  @IsOptional()
  sort?: number;

  /** 关联的属性模板ID */
  @ApiProperty({ description: '属性模板ID', required: false, example: 1 })
  @Type(() => Number)
  @IsInt({ message: '属性模板ID必须是整数' })
  @IsOptional()
  attrTemplateId?: number;
}
