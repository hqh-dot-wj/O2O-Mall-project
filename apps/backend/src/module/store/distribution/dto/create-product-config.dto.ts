import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min, Max, ValidateIf } from 'class-validator';
import { CommissionBaseType } from '@prisma/client';

export class CreateProductConfigDto {
  @ApiProperty({ description: '商品ID (与categoryId二选一)', required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ description: '品类ID (与productId二选一)', required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ description: '一级分佣比例 (0-100)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  level1Rate?: number;

  @ApiProperty({ description: '二级分佣比例 (0-100)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  level2Rate?: number;

  @ApiProperty({ description: '佣金基数类型', enum: CommissionBaseType, required: false })
  @IsOptional()
  @IsEnum(CommissionBaseType)
  commissionBaseType?: CommissionBaseType;
}
