import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class StockAlertConfigDto {
  @ApiProperty({ description: '低库存阈值，库存低于此值时触发预警', minimum: 0 })
  @IsNumber()
  @Min(0)
  threshold: number;
}
