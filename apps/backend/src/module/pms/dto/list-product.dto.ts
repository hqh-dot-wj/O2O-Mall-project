import { PageQueryDto } from 'src/common/dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

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
}
