
import { IsString, IsEnum, IsInt, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

// 枚举映射
export enum AttrUsageType { PARAM = 'PARAM', SPEC = 'SPEC' }
export enum AttrInputType { INPUT = 0, SELECT = 1 }
export enum AttrApplyType { COMMON = 0, REAL = 1, SERVICE = 2 }

// 单个属性的 DTO
export class AttributeItemDto {
    @IsOptional()
    @IsInt()
    attrId?: number; // 如果有ID就是修改，没有就是新增

    @IsString()
    name: string;

    @IsEnum(AttrUsageType)
    usageType: AttrUsageType;

    @IsEnum(AttrApplyType)
    applyType: AttrApplyType;

    @IsEnum(AttrInputType)
    inputType: AttrInputType;

    @IsOptional()
    @IsString()
    inputList?: string; // "A,B,C"

    @IsInt()
    sort: number;
}

// 创建/修改整个模板的 DTO
export class CreateTemplateDto {
    @IsString()
    name: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AttributeItemDto)
    attributes: AttributeItemDto[];
}
