import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RemoveProductDto {
  @ApiProperty({ description: '店铺商品ID' })
  @IsNotEmpty()
  @IsString()
  id: string;
}
