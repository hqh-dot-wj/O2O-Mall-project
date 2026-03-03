import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 批量导入字典数据项
 */
export class ImportDictDataItemDto {
  @ApiProperty({ description: '字典标签' })
  @IsNotEmpty({ message: '字典标签不能为空' })
  @IsString()
  dictLabel: string;

  @ApiProperty({ description: '字典键值' })
  @IsNotEmpty({ message: '字典键值不能为空' })
  @IsString()
  dictValue: string;

  @ApiProperty({ description: '字典排序', required: false })
  @IsOptional()
  @IsNumber()
  dictSort?: number;

  @ApiProperty({ description: '样式属性', required: false })
  @IsOptional()
  @IsString()
  listClass?: string;

  @ApiProperty({ description: 'CSS样式', required: false })
  @IsOptional()
  @IsString()
  cssClass?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

/**
 * 批量导入字典类型及数据
 */
export class ImportDictDto {
  @ApiProperty({ description: '字典名称' })
  @IsNotEmpty({ message: '字典名称不能为空' })
  @IsString()
  dictName: string;

  @ApiProperty({ description: '字典类型' })
  @IsNotEmpty({ message: '字典类型不能为空' })
  @IsString()
  dictType: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ description: '字典数据列表', type: [ImportDictDataItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportDictDataItemDto)
  dataList: ImportDictDataItemDto[];
}

/**
 * 批量导入结果
 */
export class ImportDictResultDto {
  @ApiProperty({ description: '成功导入的字典类型数量' })
  successTypeCount: number;

  @ApiProperty({ description: '成功导入的字典数据数量' })
  successDataCount: number;

  @ApiProperty({ description: '跳过的字典类型数量（已存在）' })
  skippedTypeCount: number;

  @ApiProperty({ description: '跳过的字典数据数量（已存在）' })
  skippedDataCount: number;

  @ApiProperty({ description: '错误信息列表', type: [String] })
  errors: string[];
}
