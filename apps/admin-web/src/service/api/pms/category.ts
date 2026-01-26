import { request } from '@/service/request';

/** Get Category Tree */
export function fetchGetCategoryTree() {
  return request<Api.Pms.CategoryTree>({
    url: '/pms/category/tree',
    method: 'get'
  });
}

/** 获取分类列表 (平级) */
export function fetchGetCategoryList(params?: Api.Pms.CategorySearchParams) {
  return request<Api.Pms.CategoryList>({
    url: '/pms/category/list',
    method: 'get',
    params
  });
}

/** Add Category */
export function fetchAddCategory(data: Api.Pms.CategoryOperateParams) {
  return request<Api.Pms.Category>({
    url: '/pms/category',
    method: 'post',
    data
  });
}

/** Update Category */
export function fetchUpdateCategory(data: Api.Pms.CategoryOperateParams) {
  return request<Api.Pms.Category>({
    url: `/pms/category/${data.catId}`,
    method: 'put',
    data
  });
}

/** Delete Category */
export function fetchDeleteCategory(id: number) {
  return request<boolean>({
    url: `/pms/category/${id}`,
    method: 'delete'
  });
}
