import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PageQueryDto } from 'src/common/dto/base.dto';

/**
 * 查询分类列表DTO
 * 用于接收分类列表查询的请求参数，支持分页和条件筛选
 */
export class ListCategoryDto extends PageQueryDto {
  /** 分类名称，支持模糊查询 */
  @ApiProperty({ description: '分类名称（模糊查询）', required: false, example: '电子产品' })
  @IsString({ message: '分类名称必须是字符串' })
  @IsOptional()
  name?: string;

  /** 父级分类ID，用于查询指定父级下的子分类 */
  @ApiProperty({ description: '父级分类ID', required: false, example: 0 })
  @Type(() => Number)
  @IsInt({ message: '父级分类ID必须是整数' })
  @IsOptional()
  parentId?: number;
}
