import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 添加购物车 DTO
 */
export class AddCartDto {
  @ApiProperty({ description: '租户ID' })
  @IsString()
  tenantId: string;

  @ApiProperty({ description: 'SKU ID' })
  @IsString()
  skuId: string;

  @ApiProperty({ description: '数量', default: 1 })
  @IsInt()
  @Min(1)
  quantity: number = 1;

  @ApiPropertyOptional({ description: '分享人ID (归因追踪)' })
  @IsOptional()
  @IsString()
  shareUserId?: string;
}

/**
 * 更新购物车数量 DTO
 */
export class UpdateCartQuantityDto {
  @ApiProperty({ description: 'SKU ID' })
  @IsString()
  skuId: string;

  @ApiProperty({ description: '新数量' })
  @IsInt()
  @Min(1)
  quantity: number;
}
