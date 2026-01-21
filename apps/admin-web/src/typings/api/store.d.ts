declare namespace Api {
    namespace Store {
        interface TenantProduct {
            id: string; // tenantProductId
            productId: string;
            name: string;
            albumPics: string;
            type: Pms.ProductType;
            status: Pms.PublishStatus;
            isHot: boolean;
            price: number;
            customTitle?: string;
            overrideRadius?: number;
            skus: TenantSku[];
        }

        interface TenantSku {
            id: string;
            price: number;
            stock: number;
            distRate: number;
            distMode: Pms.DistributionMode;
            isActive: boolean;
            specValues: any;
            costPrice: number;
            guidePrice: number;
        }

        type TenantProductList = Common.PaginatingQueryRecord<TenantProduct>;

        interface ListStoreProductParams extends Common.PaginatingCommonParams {
            name?: string | null;
            type?: Pms.ProductType | null;
            status?: Pms.PublishStatus | null;
        }

        interface ImportSkuParams {
            globalSkuId: string;
            price: number;
            stock: number;
            distRate?: number;
            distMode?: Pms.DistributionMode;
        }

        interface ProductImportParams {
            productId: string;
            overrideRadius?: number | null;
            skus: ImportSkuParams[];
        }

        interface ProductPriceUpdateParams {
            tenantSkuId: string;
            price: number;
            stock: number;
            distRate: number;
            distMode?: Pms.DistributionMode;
        }

        interface ProductBaseUpdateParams {
            id: string;
            status: Pms.PublishStatus;
            customTitle?: string;
            overrideRadius?: number;
        }

        /** Market Product (Global Product with Import Status) */
        type MarketProduct = Pms.Product & {
            isImported: boolean;
            price: number;
            type: Pms.ProductType
            serviceRadius?: number;
            globalSkus?: Pms.GlobalSku[];
        };

        type MarketProductList = Common.PaginatingQueryRecord<MarketProduct>;

        interface MarketSearchParams extends Common.PaginatingCommonParams {
            name?: string | null;
            categoryId?: number | null;
            type?: 'REAL' | 'SERVICE' | null;
        }

        interface DistributionConfig {
            id: number;
            level1Rate: number;
            level2Rate: number;
            enableLV0: boolean;
            createTime: string;
        }

        interface DistributionConfigUpdateParams {
            level1Rate: number;
            level2Rate: number;
            enableLV0: boolean;
        }

        interface DistributionConfigLog {
            id: number;
            configId: number;
            level1Rate: number;
            level2Rate: number;
            enableLV0: boolean;
            operator: string;
            createTime: string;
        }
    }
}
