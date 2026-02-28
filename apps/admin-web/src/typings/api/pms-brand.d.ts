declare namespace Api {
  namespace Pms {
    type Brand = import('@libs/common-types').components['schemas']['BrandVo'];

    type BrandList = Common.PaginatingQueryRecord<Brand>;

    type BrandSearchParams = CommonType.RecordNullable<Pick<Brand, 'name'> & Api.Common.CommonSearchParams>;

    type BrandOperateParams = import('@libs/common-types').components['schemas']['CreateBrandDto'] & {
      brandId?: number;
    };
  }
}
