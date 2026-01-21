import { ApiProperty } from '@nestjs/swagger';

/**
 * C端商品分类VO
 */
export class ClientCategoryVo {
    @ApiProperty({ description: '分类ID' })
    catId: number;

    @ApiProperty({ description: '分类名称' })
    name: string;

    @ApiProperty({ description: '图标' })
    icon?: string;

    @ApiProperty({ description: '父级ID' })
    parentId?: number;

    @ApiProperty({ description: '排序' })
    sort?: number;

    @ApiProperty({ description: '子分类', type: [ClientCategoryVo] })
    children?: ClientCategoryVo[];
}
