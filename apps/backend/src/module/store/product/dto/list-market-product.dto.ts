import { PageQueryDto } from 'src/common/dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsEnum } from 'class-validator';
import { ProductType } from '@prisma/client';
import { Type } from 'class-transformer';

export class ListMarketProductDto extends PageQueryDto {
  @ApiProperty({ description: '商品名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '分类ID', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;

  @ApiProperty({ description: '商品类型', enum: ProductType, required: false })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;
}
