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

/**
 * 订单退款
 */
export function fetchRefundOrder(data: { orderId: string; remark?: string }) {
  return request<void>({
    url: `${BASE}/refund`,
    method: 'post',
    data
  });
}

/**
 * 部分退款（按商品维度）
 */
export function fetchPartialRefundOrder(data: {
  orderId: string;
  items: Array<{ itemId: number; quantity: number }>;
  remark?: string;
}) {
  return request<{
    refundAmount: string;
    refundRatio: string;
    isFullRefund: boolean;
    refundDetails: Array<{ itemId: number; quantity: number; amount: string }>;
  }>({
    url: `${BASE}/refund/partial`,
    method: 'post',
    data
  });
}

/**
 * 导出订单数据（返回 Excel 文件流）
 */
export function fetchExportOrders(params?: Api.Order.SearchParams) {
  return request<Blob>({
    url: `${BASE}/export`,
    method: 'get',
    params,
    responseType: 'blob'
  });
}

/**
 * 批量核销
 */
export function fetchBatchVerify(data: { orderIds: string[]; remark?: string }) {
  return request<{
    successCount: number;
    failCount: number;
    details: Array<{ orderId: string; success: boolean; error?: string }>;
  }>({
    url: `${BASE}/batch/verify`,
    method: 'post',
    data
  });
}

/**
 * 批量退款
 */
export function fetchBatchRefund(data: { orderIds: string[]; remark?: string }) {
  return request<{
    successCount: number;
    failCount: number;
    details: Array<{ orderId: string; success: boolean; error?: string }>;
  }>({
    url: `${BASE}/batch/refund`,
    method: 'post',
    data
  });
}
