import { ApiProperty } from '@nestjs/swagger';
import { PublishStatus } from '@prisma/client';

export class StoreProductVo {
    @ApiProperty({ description: '店铺商品ID' })
    id: string;

    @ApiProperty({ description: '商品名称(关联)' })
    name: string;

    @ApiProperty({ description: '商品图片(关联)', type: String })
    albumPics: string;

    @ApiProperty({ description: '上架状态', enum: PublishStatus })
    status: PublishStatus;

    @ApiProperty({ description: '是否热销' })
    isHot: boolean;

    @ApiProperty({ description: '售价(起)' })
    price: number;
}
