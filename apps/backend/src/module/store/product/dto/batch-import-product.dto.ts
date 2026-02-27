import { IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ImportProductDto } from './import-product.dto';

export class BatchImportProductDto {
  @ApiProperty({ description: '批量导入商品列表', type: [ImportProductDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ImportProductDto)
  items: ImportProductDto[];
}
