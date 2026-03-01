import { describe, expect, it, vi } from 'vitest';
import {
  fetchBatchRefund,
  fetchBatchVerify,
  fetchExportOrders,
  fetchGetDispatchList,
  fetchGetOrderDetail,
  fetchGetOrderList,
  fetchPartialRefundOrder,
  fetchReassignWorker,
  fetchRefundOrder,
  fetchVerifyService
} from './order';

vi.mock('@/service/request', () => ({
  request: vi.fn((config: unknown) => Promise.resolve({ data: config }))
}));

describe('Store Order API', () => {
  it('fetchGetOrderList should have correct config', async () => {
    const params = { pageNum: 1, pageSize: 10 };
    const res = await fetchGetOrderList(params);
    expect(res.data).toMatchObject({
      url: '/store/order/list',
      method: 'get',
      params
    });
  });

  it('fetchGetOrderDetail should have correct config', async () => {
    const id = 'ord1';
    const res = await fetchGetOrderDetail(id);
    expect(res.data).toMatchObject({
      url: `/store/order/detail/${id}`,
      method: 'get'
    });
  });

  it('fetchGetDispatchList should have correct config', async () => {
    const params = { pageNum: 1, pageSize: 10 };
    const res = await fetchGetDispatchList(params);
    expect(res.data).toMatchObject({
      url: '/store/order/dispatch/list',
      method: 'get',
      params
    });
  });

  it('fetchReassignWorker should have correct config', async () => {
    const data = { orderId: 'ord1', newWorkerId: 123 };
    const res = await fetchReassignWorker(data);
    expect(res.data).toMatchObject({
      url: '/store/order/reassign',
      method: 'post',
      data
    });
  });

  it('fetchVerifyService should have correct config', async () => {
    const data = { orderId: 'ord1', remark: '核销备注' };
    const res = await fetchVerifyService(data);
    expect(res.data).toMatchObject({
      url: '/store/order/verify',
      method: 'post',
      data
    });
  });

  it('fetchRefundOrder should have correct config', async () => {
    const data = { orderId: 'ord1', remark: '退款原因' };
    const res = await fetchRefundOrder(data);
    expect(res.data).toMatchObject({
      url: '/store/order/refund',
      method: 'post',
      data
    });
  });

  it('fetchPartialRefundOrder should have correct config', async () => {
    const data = {
      orderId: 'ord1',
      items: [{ itemId: 1, quantity: 2 }],
      remark: '部分退款'
    };
    const res = await fetchPartialRefundOrder(data);
    expect(res.data).toMatchObject({
      url: '/store/order/refund/partial',
      method: 'post',
      data
    });
  });

  it('fetchExportOrders should have correct config', async () => {
    const params = { pageNum: 1, pageSize: 100 };
    const res = await fetchExportOrders(params);
    expect(res.data).toMatchObject({
      url: '/store/order/export',
      method: 'get',
      params,
      responseType: 'blob'
    });
  });

  it('fetchBatchVerify should have correct config', async () => {
    const data = { orderIds: ['ord1', 'ord2'], remark: '批量核销' };
    const res = await fetchBatchVerify(data);
    expect(res.data).toMatchObject({
      url: '/store/order/batch/verify',
      method: 'post',
      data
    });
  });

  it('fetchBatchRefund should have correct config', async () => {
    const data = { orderIds: ['ord1', 'ord2'], remark: '批量退款' };
    const res = await fetchBatchRefund(data);
    expect(res.data).toMatchObject({
      url: '/store/order/batch/refund',
      method: 'post',
      data
    });
  });
});
