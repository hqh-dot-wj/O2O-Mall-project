import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/**
 * 更新商品 DTO
 * 继承自 CreateProductDto，所有字段均为可选
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
