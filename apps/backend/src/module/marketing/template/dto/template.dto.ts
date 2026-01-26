import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';
import { PageQueryDto } from 'src/common/dto/base.dto';

export class PlayTemplateDto {
  @ApiProperty({ description: '模板名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '模板唯一标识' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: '单位名称' })
  @IsString()
  @IsNotEmpty()
  unitName: string;

  @ApiProperty({ description: '规则Schema配置' })
  @IsObject()
  @IsNotEmpty()
  ruleSchema: Record<string, any>;

  @ApiProperty({ description: '前端组件ID', required: false })
  @IsOptional()
  @IsString()
  uiComponentId?: string;
}

export class CreatePlayTemplateDto extends PlayTemplateDto {}

export class UpdatePlayTemplateDto extends PlayTemplateDto {}

export class ListPlayTemplateDto extends PageQueryDto {
  @ApiProperty({ description: '模板名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '模板编码', required: false })
  @IsOptional()
  @IsString()
  code?: string;
}
