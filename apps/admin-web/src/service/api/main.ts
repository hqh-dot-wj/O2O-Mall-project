import { request } from '@/service/request';

/**
 * 获取首页统计数据
 */
export function fetchGetDashboardStats() {
  return request<Api.Main.DashboardStats>({
    url: '/dashboard/stats',
    method: 'get'
  });
}
