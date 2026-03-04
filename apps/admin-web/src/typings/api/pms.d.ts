/**
 * PMS 商品类型
 * 优先使用 @libs/common-types 生成类型，SearchParams 使用 RequestParams 与后端 ListProductDto 对齐
 */
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

    /** 与后端 ListProductDto 对齐，优先使用 RequestParams；publishStatus 在后端已支持，generate-types 后会自动包含 */
    type ProductSearchParams = CommonType.RecordNullable<
      import('@libs/common-types').RequestParams<'/api/admin/pms/product/list', 'get'> & {
        publishStatus?: PublishStatus;
      }
    >;
  }
}
