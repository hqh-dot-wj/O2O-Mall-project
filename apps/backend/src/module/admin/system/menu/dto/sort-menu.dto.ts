import { IsNumber, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 菜单排序项
 */
export class MenuSortItem {
  @ApiProperty({ description: '菜单ID' })
  @IsNumber()
  menuId: number;

  @ApiProperty({ description: '显示顺序' })
  @IsNumber()
  orderNum: number;
}

/**
 * 菜单拖拽排序 DTO
 */
export class SortMenuDto {
  @ApiProperty({ description: '排序列表', type: [MenuSortItem] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MenuSortItem)
  items: MenuSortItem[];
}
