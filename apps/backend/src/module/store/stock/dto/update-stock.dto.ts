import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({ description: 'SKU ID', required: true })
  @IsString()
  @IsNotEmpty()
  skuId: string;

  @ApiProperty({ description: '库存变动值（正数增加，负数减少）', required: true })
  @IsNumber()
  @IsNotEmpty()
  stockChange: number;

  @ApiProperty({ description: '变动原因（如：进货补货、盘点调整、损耗报废）', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
