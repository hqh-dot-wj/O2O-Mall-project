import { PartialType } from '@nestjs/swagger';
import { CreateProductConfigDto } from './create-product-config.dto';

export class UpdateProductConfigDto extends PartialType(CreateProductConfigDto) {}
