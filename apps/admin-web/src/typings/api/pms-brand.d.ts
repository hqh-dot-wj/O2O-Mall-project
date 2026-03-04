/**
 * PMS 品牌类型
 * 全部来自 @libs/common-types
 */
declare namespace Api {
  namespace Pms {
    type Brand = import('@libs/common-types').components['schemas']['BrandVo'];

    type BrandList = Common.PaginatingQueryRecord<Brand>;

    /** 与后端 ListBrandDto 对齐 */
    type BrandSearchParams = CommonType.RecordNullable<
      import('@libs/common-types').RequestParams<'/api/admin/pms/brand/list', 'get'>
    >;

    type BrandOperateParams = import('@libs/common-types').components['schemas']['CreateBrandDto'] & {
      brandId?: number;
    };
  }
}
