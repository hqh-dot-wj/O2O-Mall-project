import { PartialType } from '@nestjs/swagger';
import { CreateBrandDto } from './create-brand.dto';

/**
 * 更新品牌DTO
 */
export class UpdateBrandDto extends PartialType(CreateBrandDto) {}
