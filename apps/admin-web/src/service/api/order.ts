import { request } from '@/service/request';

/**
 * 获取订单列表
 */
export function fetchGetOrderList(params: Api.Order.SearchParams) {
  return request<Api.Order.ListResult>({
    url: '/order/list',
    method: 'get',
    params
  });
}

/**
 * 获取订单详情
 */
export function fetchGetOrderDetail(id: string) {
  return request<Api.Order.DetailResult>({
    url: `/order/detail/${id}`,
    method: 'get'
  });
}

/**
 * 获取待派单列表
 */
export function fetchGetDispatchList(params: Api.Order.SearchParams) {
  return request<Api.Order.ListResult>({
    url: '/order/dispatch/list',
    method: 'get',
    params
  });
}

/**
 * 改派技师
 */
export function fetchReassignWorker(data: { orderId: string; newWorkerId: number }) {
  return request<void>({
    url: '/order/reassign',
    method: 'post',
    data
  });
}

/**
 * 强制核销
 */
export function fetchVerifyService(data: { orderId: string; remark?: string }) {
  return request<void>({
    url: '/order/verify',
    method: 'post',
    data
  });
}
