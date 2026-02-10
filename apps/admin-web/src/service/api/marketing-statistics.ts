import { request } from '@/service/request';

/** Marketing API - Statistics (admin paths) */

/** Get coupon statistics */
export function fetchGetCouponStatistics(params?: { templateId?: string }) {
  return request<Api.Marketing.CouponStatistics>({
    url: '/admin/marketing/coupon/statistics',
    method: 'get',
    params
  });
}

/** Get points statistics (overview - use points/statistics/* for detailed) */
export function fetchGetPointsStatistics() {
  return request<Api.Marketing.PointsStatistics>({
    url: '/admin/marketing/points/statistics/balance',
    method: 'get'
  });
}
