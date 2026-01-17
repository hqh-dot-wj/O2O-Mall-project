declare namespace Api {
    namespace Pms {
        type DistributionMode = 'RATIO' | 'FIXED' | 'NONE';
        type ProductType = 'REAL' | 'SERVICE';

        type Product = Common.CommonRecord<{
            productId: string;
            name: string;
            subTitle?: string;
            categoryId: number;
            brandId?: number;
            albumPics?: string;
            description?: string;
            publishStatus: string;
            price: number;
            detailHtml: string;
            globalSkus: GlobalSku[];
        }>;

        interface GlobalSku {
            skuId: string;
            productId: string;
            skuCode?: string;
            price?: number;
            stock?: number;
            pic?: string;
            specValues: any;
            guidePrice: number; // 零售指导价
            guideRate: number;  // 指导费率
            minDistRate: number; // 最低比例
            maxDistRate: number; // 最高比例
            distMode: DistributionMode;
            costPrice: number;  // 成本价
        }

        interface ProductOperateParams {
            productId?: string;
            // Common
            name: string;
            categoryId: number;
            brandId?: number;
            subTitle?: string;
            description?: string; // minimal desc
            detailHtml?: string;  // rich text
            pic?: string; // main pic
            albumPics?: string[]; // strings
            publishStatus?: string;
            sort?: number;

            // Type
            type: 'REAL' | 'SERVICE';

            // Real fields
            weight?: number;
            isFreeShip?: boolean;

            // Service fields
            serviceDuration?: number;
            serviceRadius?: number;

            // Complex
            specDef?: any[]; // Array<{ name: string; values: string[] }>
            skus: GlobalSkuOperate[];
            attrs?: { attrId: number; value: string }[];
        }

        interface GlobalSkuOperate {
            specValues: any;
            guidePrice: number;
            guideRate: number;
            minDistRate: number;
            maxDistRate: number;
            distMode: DistributionMode;
            stock?: number;
            skuImage?: string;
            skuCode?: string;
            pic?: string;
            costPrice?: number;
        }

        type ProductList = Common.PaginatingQueryRecord<Product>;

        type ProductSearchParams = CommonType.RecordNullable<
            Pick<Product, 'name' | 'categoryId' | 'publishStatus'> & {
                startTime?: string;
                endTime?: string;
            }
        > & Pick<Common.PaginatingCommonParams, 'pageNum' | 'pageSize'>;
    }
}
