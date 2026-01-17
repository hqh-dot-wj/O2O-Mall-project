import { request } from '@/service/request';

/** Get Brand List */
export function fetchGetBrandList(params?: Api.Pms.BrandSearchParams) {
  return request<Api.Pms.BrandList>({
    url: '/pms/brand/list',
    method: 'get',
    params,
  });
}

/** Add Brand */
export function fetchAddBrand(data: Api.Pms.BrandOperateParams) {
  return request<Api.Pms.Brand>({
    url: '/pms/brand',
    method: 'post',
    data,
  });
}

/** Update Brand */
export function fetchUpdateBrand(data: Api.Pms.BrandOperateParams) {
  return request<Api.Pms.Brand>({
    url: `/pms/brand/${data.brandId}`,
    method: 'put',
    data,
  });
}

/** Delete Brand */
export function fetchDeleteBrand(id: number) {
  return request<boolean>({
    url: `/pms/brand/${id}`,
    method: 'delete',
  });
}
