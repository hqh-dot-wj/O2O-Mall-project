import { request } from '@/service/request';

/** 营销API - 门店商品配置 */
export function fetchGetStoreConfigList(params?: Api.Marketing.StoreConfigSearchParams) {
  return request<Api.Marketing.StoreConfigList>({
    url: '/marketing/config/list',
    method: 'get',
    params
  });
}

export function fetchCreateStoreConfig(data: Api.Marketing.StoreConfigCreate) {
  return request<Api.Marketing.StoreConfig>({
    url: '/marketing/config',
    method: 'post',
    data
  });
}

export function fetchUpdateStoreConfig(id: string, data: Api.Marketing.StoreConfigUpdate) {
  return request<Api.Marketing.StoreConfig>({
    url: `/marketing/config/${id}`,
    method: 'put',
    data
  });
}

// 快捷上下架
export function fetchUpdateStoreConfigStatus(id: string, status: string) {
  return request({
    url: `/marketing/config/${id}/status`,
    method: 'patch',
    data: { status }
  });
}

export function fetchDeleteStoreConfig(id: string) {
  return request({
    url: `/marketing/config/${id}`,
    method: 'delete'
  });
}
