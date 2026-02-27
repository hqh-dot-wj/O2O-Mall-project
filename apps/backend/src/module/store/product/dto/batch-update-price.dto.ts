import { IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UpdateProductPriceDto } from './update-price.dto';

export class BatchUpdateProductPriceDto {
  @ApiProperty({ description: '批量调价列表', type: [UpdateProductPriceDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => UpdateProductPriceDto)
  items: UpdateProductPriceDto[];
}
