import { IsString, IsInt, IsEnum, IsArray, IsBoolean, IsOptional, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PublishStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export enum ProductType { REAL = 'REAL', SERVICE = 'SERVICE' }
export enum DistributionMode { RATIO = 'RATIO', FIXED = 'FIXED', NONE = 'NONE' }

// SKU DTO
export class CreateSkuDto {
    @ApiProperty({ description: 'SKU ID (更新时必传)', required: false })
    @IsOptional()
    @IsString()
    skuId?: string;

    @ApiProperty({ description: '规格值', example: { Color: 'Red' } })
    @IsOptional()
    specValues: Record<string, any>;

    @ApiProperty({ description: 'SKU图片', required: false })
    @IsString()
    @IsOptional()
    skuImage?: string;

    @ApiProperty({ description: '指导价' })
    @IsNumber()
    @Min(0)
    guidePrice: number;

    @ApiProperty({ description: '分销模式', enum: DistributionMode })
    @IsEnum(DistributionMode)
    distMode: DistributionMode;

    @ApiProperty({ description: '指导费率' })
    @IsNumber()
    guideRate: number;

    @ApiProperty({ description: '最小分销费率' })
    @IsNumber()
    @Min(0)
    minDistRate: number;

    @ApiProperty({ description: '最大分销费率' })
    @IsNumber()
    @Min(0)
    maxDistRate: number;
}

// Attribute Value DTO
export class CreateAttrValueDto {
    @ApiProperty({ description: '属性ID' })
    @IsInt()
    attrId: number;

    @ApiProperty({ description: '属性值' })
    @IsString()
    value: string;
}

// Main Product Creation DTO
export class CreateProductDto {
    @ApiProperty({ description: '分类ID' })
    @IsInt()
    categoryId: number;

    @ApiProperty({ description: '品牌ID', required: false })
    @IsOptional()
    @IsInt()
    brandId?: number;

    @ApiProperty({ description: '商品名称' })
    @IsString()
    name: string;

    @ApiProperty({ description: '副标题', required: false })
    @IsString()
    @IsOptional()
    subTitle?: string;

    @ApiProperty({ description: '商品主图列表', type: [String] })
    @IsArray()
    @IsString({ each: true })
    mainImages: string[];

    @ApiProperty({ description: '详情页HTML' })
    @IsString()
    detailHtml: string;

    @ApiProperty({ description: '商品类型', enum: ProductType })
    @IsEnum(ProductType)
    type: ProductType;

    // Real Product Fields
    @ApiProperty({ description: '重量(g)', required: false })
    @IsOptional()
    @IsInt()
    weight?: number;

    @ApiProperty({ description: '是否包邮', required: false })
    @IsOptional()
    @IsBoolean()
    isFreeShip?: boolean;

    // Service Product Fields
    @ApiProperty({ description: '服务时长(分钟)', required: false })
    @IsOptional()
    @IsInt()
    serviceDuration?: number;

    @ApiProperty({ description: '服务半径(km)', required: false })
    @IsOptional()
    @IsInt()
    serviceRadius?: number;

    @ApiProperty({ description: '规格定义', isArray: true })
    @IsArray()
    specDef: any[];

    @ApiProperty({ description: 'SKU列表', type: [CreateSkuDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateSkuDto)
    skus: CreateSkuDto[];

    @ApiProperty({ description: '属性列表', type: [CreateAttrValueDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateAttrValueDto)
    attrs: CreateAttrValueDto[];

    @ApiProperty({ description: '上架状态', enum: PublishStatus, required: false })
    @IsOptional()
    @IsEnum(PublishStatus)
    publishStatus?: PublishStatus;
}
