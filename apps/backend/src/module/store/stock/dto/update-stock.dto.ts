import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsNotEmpty } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({ description: 'SKU ID', required: true })
  @IsString()
  @IsNotEmpty()
  skuId: string;

  @ApiProperty({ description: '库存变动值', required: true })
  @IsNumber()
  @IsNotEmpty()
  stockChange: number;
}
