import { request } from '@/service/request';

const BASE = '/store/order';

/**
 * 获取订单列表
 */
export function fetchGetOrderList(params: Api.Order.SearchParams) {
  return request<Api.Order.ListResult>({
    url: `${BASE}/list`,
    method: 'get',
    params
  });
}

/**
 * 获取订单详情
 */
export function fetchGetOrderDetail(id: string) {
  return request<Api.Order.DetailResult>({
    url: `${BASE}/detail/${id}`,
    method: 'get'
  });
}

/**
 * 获取待派单列表
 */
export function fetchGetDispatchList(params: Api.Order.SearchParams) {
  return request<Api.Order.ListResult>({
    url: `${BASE}/dispatch/list`,
    method: 'get',
    params
  });
}

/**
 * 改派技师
 */
export function fetchReassignWorker(data: { orderId: string; newWorkerId: number }) {
  return request<void>({
    url: `${BASE}/reassign`,
    method: 'post',
    data
  });
}

/**
 * 强制核销
 */
export function fetchVerifyService(data: { orderId: string; remark?: string }) {
  return request<void>({
    url: `${BASE}/verify`,
    method: 'post',
    data
  });
}
