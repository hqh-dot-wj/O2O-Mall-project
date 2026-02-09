import { IsNumber, IsOptional, IsDateString, Min, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 限时秒杀规则 DTO
 */
export class FlashSaleRulesDto {
  @ApiProperty({ description: '秒杀价格' })
  @IsNumber()
  @Min(0.01, { message: '秒杀价格必须大于0' })
  flashPrice: number;

  @ApiProperty({ description: '总库存数量' })
  @IsInt({ message: '库存必须是整数' })
  @Min(1, { message: '库存必须大于0' })
  totalStock: number;

  @ApiProperty({ description: '每人限购数量', default: 1 })
  @IsOptional()
  @IsInt({ message: '限购数量必须是整数' })
  @Min(1, { message: '限购数量必须大于0' })
  limitPerUser?: number;

  @ApiProperty({ description: '秒杀开始时间' })
  @IsDateString({}, { message: '开始时间格式不正确' })
  startTime: string;

  @ApiProperty({ description: '秒杀结束时间' })
  @IsDateString({}, { message: '结束时间格式不正确' })
  endTime: string;
}

/**
 * 秒杀参与 DTO
 */
export class FlashSaleJoinDto {
  @ApiProperty({ description: '购买数量', default: 1 })
  @IsOptional()
  @IsInt({ message: '购买数量必须是整数' })
  @Min(1, { message: '购买数量必须大于0' })
  quantity?: number;
}
