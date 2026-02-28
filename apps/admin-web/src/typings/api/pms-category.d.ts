declare namespace Api {
  namespace Pms {
    type Category = import('@libs/common-types').components['schemas']['CategoryVo'];

    type CategoryTree = Category[];

    type CategoryList = Common.PaginatingQueryRecord<Category>;

    type CategorySearchParams = CommonType.RecordNullable<
      Pick<Category, 'name' | 'parentId'> & Api.Common.CommonSearchParams
    >;

    type CategoryOperateParams = import('@libs/common-types').components['schemas']['CreateCategoryDto'] & {
      catId?: number;
    };
  }
}
