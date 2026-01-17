import { ApiProperty } from '@nestjs/swagger';
import { ProductType, PublishStatus } from '@prisma/client';

export class ProductVo {
    @ApiProperty({ description: '商品ID' })
    productId: string;

    @ApiProperty({ description: '商品名称' })
    name: string;

    @ApiProperty({ description: '商品分类ID' })
    categoryId: number;

    @ApiProperty({ description: '品牌ID' })
    brandId?: number;

    @ApiProperty({ description: '副标题' })
    subTitle?: string;

    @ApiProperty({ description: '商品主图', isArray: true, type: String })
    mainImages: string[];

    @ApiProperty({ description: '商品相册(兼容字段)', type: String })
    albumPics: string;

    @ApiProperty({ description: '详情页HTML' })
    detailHtml: string;

    @ApiProperty({ description: '商品类型', enum: ProductType })
    type: ProductType;

    @ApiProperty({ description: '重量(g)' })
    weight?: number;

    @ApiProperty({ description: '是否包邮' })
    isFreeShip?: boolean;

    @ApiProperty({ description: '服务时长(Service Types)' })
    serviceDuration?: number;

    @ApiProperty({ description: '服务半径' })
    serviceRadius?: number;

    @ApiProperty({ description: '是否需要预约' })
    needBooking: boolean;

    @ApiProperty({ description: '上架状态: 0-下架, 1-上架' })
    publishStatus: string;

    @ApiProperty({ description: '价格(起)' })
    price: number;
}
