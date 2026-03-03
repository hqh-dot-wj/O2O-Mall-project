import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 字典数据排序项
 */
export class DictDataSortItemDto {
  @ApiProperty({ description: '字典数据编码' })
  @IsNotEmpty({ message: '字典数据编码不能为空' })
  @IsNumber()
  dictCode: number;

  @ApiProperty({ description: '排序值' })
  @IsNotEmpty({ message: '排序值不能为空' })
  @IsNumber()
  dictSort: number;
}

/**
 * 批量更新字典数据排序
 */
export class SortDictDataDto {
  @ApiProperty({ description: '字典类型' })
  @IsNotEmpty({ message: '字典类型不能为空' })
  dictType: string;

  @ApiProperty({ description: '排序列表', type: [DictDataSortItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DictDataSortItemDto)
  sortList: DictDataSortItemDto[];
}
