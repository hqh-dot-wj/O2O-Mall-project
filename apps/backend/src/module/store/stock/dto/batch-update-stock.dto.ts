import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 批量库存调整单项
 */
export class BatchUpdateStockItemDto {
  @ApiProperty({ description: 'SKU ID' })
  @IsString()
  skuId: string;

  @ApiProperty({ description: '库存变动值（正数增加，负数减少）' })
  @IsNumber()
  stockChange: number;

  @ApiProperty({ description: '变动原因', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

/**
 * 批量调整库存 DTO
 */
export class BatchUpdateStockDto {
  @ApiProperty({ description: '库存调整项列表', type: [BatchUpdateStockItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchUpdateStockItemDto)
  items: BatchUpdateStockItemDto[];
}
