import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PageQueryDto } from 'src/common/dto';
import { ProductType, PublishStatus } from '@prisma/client';

export class ListStoreProductDto extends PageQueryDto {
    @ApiProperty({ description: '商品名称/自定义标题', required: false })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ description: '商品类型', enum: ProductType, required: false })
    @IsOptional()
    @IsEnum(ProductType)
    type?: ProductType;

    @ApiProperty({ description: '上架状态', enum: PublishStatus, required: false })
    @IsOptional()
    @IsEnum(PublishStatus)
    status?: PublishStatus;
}
