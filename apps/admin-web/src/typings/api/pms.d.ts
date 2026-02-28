declare namespace Api {
  namespace Pms {
    type DistributionMode = import('@libs/common-types').components['schemas']['CreateSkuDto']['distMode'];
    type ProductType = import('@libs/common-types').components['schemas']['CreateProductDto']['type'];
    type PublishStatus = NonNullable<
      import('@libs/common-types').components['schemas']['CreateProductDto']['publishStatus']
    >;

    /** Product Vo from backend */
    type Product = import('@libs/common-types').components['schemas']['ProductVo'];

    /** Sku Vo from backend or SKU create/edit object */
    type GlobalSku = import('@libs/common-types').components['schemas']['CreateSkuDto'] & {
      skuId?: string;
      productId?: string;
    };

    /** Create/Update Product Dto */
    type ProductOperateParams = import('@libs/common-types').components['schemas']['CreateProductDto'] & {
      productId?: string;
    };

    /** SKU Operate object used in frontend forms */
    type GlobalSkuOperate = import('@libs/common-types').components['schemas']['CreateSkuDto'] & {
      skuId?: string;
      productId?: string;
    };

    type ProductList = Common.PaginatingQueryRecord<Product>;

    type ProductSearchParams = CommonType.RecordNullable<
      Pick<Product, 'name' | 'categoryId' | 'publishStatus'> & {
        startTime?: string;
        endTime?: string;
      }
    > &
      Pick<Common.PaginatingCommonParams, 'pageNum' | 'pageSize'>;
  }
}
