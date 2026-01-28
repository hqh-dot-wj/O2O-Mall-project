import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

/**
 * 更新分类DTO
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
