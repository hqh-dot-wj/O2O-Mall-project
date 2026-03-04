/**
 * PMS 分类类型
 * 全部来自 @libs/common-types，CreateCategoryDto 已含 bindType（需 pnpm generate-types）
 */
declare namespace Api {
  namespace Pms {
    type Category = import('@libs/common-types').components['schemas']['CategoryVo'];

    type CategoryTree = Category[];

    type CategoryList = Common.PaginatingQueryRecord<Category>;

    /** 与后端 ListCategoryDto 对齐 */
    type CategorySearchParams = CommonType.RecordNullable<
      import('@libs/common-types').RequestParams<'/api/admin/pms/category/list', 'get'>
    >;

    type CategoryOperateParams = import('@libs/common-types').components['schemas']['CreateCategoryDto'] & {
      catId?: number;
    };
  }
}
