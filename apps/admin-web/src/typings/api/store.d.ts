declare namespace Api {
    namespace Store {
        interface TenantProduct {
            id: string; // tenantSkuId
            productId: string;
            product: Pms.Product;
            price: number;
            distRate: number;
            distMode: Pms.DistributionMode;
            customTitle?: string;
            skus: TenantSku[];
        }

        interface TenantSku {
            id: string;
            price: number;
            distRate: number;
            distMode: Pms.DistributionMode;
        }

        type TenantProductList = Common.PaginatingQueryRecord<TenantProduct>;

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
            distRate: number;
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
    }
}
