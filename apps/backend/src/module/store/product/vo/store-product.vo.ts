import { ApiProperty } from '@nestjs/swagger';
import { PublishStatus, ProductType, DistributionMode } from '@prisma/client';

export class StoreSkuVo {
    @ApiProperty({ description: '店铺SKU ID' })
    id: string;

    @ApiProperty({ description: '售价' })
    price: number;

    @ApiProperty({ description: '库存/日接单量' })
    stock: number;

    @ApiProperty({ description: '分佣模式', enum: DistributionMode })
    distMode: DistributionMode;

    @ApiProperty({ description: '分佣比例/金额' })
    distRate: number;

    @ApiProperty({ description: '是否有效' })
    isActive: boolean;

    @ApiProperty({ description: '规格值', type: 'object', additionalProperties: true })
    specValues: any;

    @ApiProperty({ description: '成本价' })
    costPrice: number;

    @ApiProperty({ description: '总部指导价' })
    guidePrice: number;
}

export class StoreProductVo {
    @ApiProperty({ description: '店铺商品ID' })
    id: string;

    @ApiProperty({ description: '商品ID(全局)' })
    productId: string;

    @ApiProperty({ description: '商品名称(关联)' })
    name: string;

    @ApiProperty({ description: '商品图片(关联)', type: String })
    albumPics: string;

    @ApiProperty({ description: '产品类型', enum: ProductType })
    type: ProductType;

    @ApiProperty({ description: '上架状态', enum: PublishStatus })
    status: PublishStatus;

    @ApiProperty({ description: '是否热销' })
    isHot: boolean;

    @ApiProperty({ description: '售价(起)' })
    price: number;

    @ApiProperty({ description: '自定义标题' })
    customTitle?: string;

    @ApiProperty({ description: '覆盖服务半径' })
    overrideRadius?: number;

    @ApiProperty({ description: 'SKU列表', type: [StoreSkuVo] })
    skus: StoreSkuVo[];
}
