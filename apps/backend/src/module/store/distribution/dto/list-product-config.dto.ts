import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PageQueryDto } from 'src/common/dto/base.dto';

export class ListProductConfigDto extends PageQueryDto {
  @ApiProperty({ description: '商品ID', required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ description: '品类ID', required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
