import { PageQueryDto } from 'src/common/dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListStockDto extends PageQueryDto {
  @ApiProperty({ description: '商品名称', required: false })
  @IsOptional()
  @IsString()
  productName?: string;
}
