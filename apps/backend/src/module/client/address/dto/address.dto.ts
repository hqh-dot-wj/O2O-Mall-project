import { IsString, IsOptional, IsBoolean, MaxLength, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 创建地址 DTO
 */
export class CreateAddressDto {
  @ApiProperty({ description: '收货人姓名' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: '联系电话' })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ description: '省' })
  @IsString()
  @MaxLength(50)
  province: string;

  @ApiProperty({ description: '市' })
  @IsString()
  @MaxLength(50)
  city: string;

  @ApiProperty({ description: '区/县' })
  @IsString()
  @MaxLength(50)
  district: string;

  @ApiProperty({ description: '详细地址' })
  @IsString()
  @MaxLength(500)
  detail: string;

  @ApiPropertyOptional({ description: '纬度' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: '经度' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: '是否设为默认' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: '标签: 家、公司、学校' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  tag?: string;
}

/**
 * 更新地址 DTO
 */
export class UpdateAddressDto extends CreateAddressDto {
  @ApiProperty({ description: '地址ID' })
  @IsString()
  id: string;
}
