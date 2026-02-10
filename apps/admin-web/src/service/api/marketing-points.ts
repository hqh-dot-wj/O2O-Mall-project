import { request } from '@/service/request';

/** Marketing API - Points (admin prefix) */

/** Get points rule config */
export function fetchGetPointsRuleConfig() {
  return request<Api.Marketing.PointsRule>({
    url: '/admin/marketing/points/rules',
    method: 'get',
  });
}

/** Update points rule config */
export function fetchUpdatePointsRuleConfig(data: Api.Marketing.PointsRuleUpdate) {
  return request<Api.Marketing.PointsRule>({
    url: '/admin/marketing/points/rules',
    method: 'put',
    data,
  });
}

/** Get point task list */
export function fetchGetPointTaskList(params?: Api.Marketing.PointTaskSearchParams) {
  return request<Api.Marketing.PointTaskList>({
    url: '/admin/marketing/points/tasks',
    method: 'get',
    params,
  });
}

/** Create point task */
export function fetchCreatePointTask(data: Api.Marketing.PointTaskCreate) {
  return request<Api.Marketing.PointTask>({
    url: '/admin/marketing/points/tasks',
    method: 'post',
    data,
  });
}

/** Update point task */
export function fetchUpdatePointTask(id: string, data: Api.Marketing.PointTaskUpdate) {
  return request<Api.Marketing.PointTask>({
    url: `/admin/marketing/points/tasks/${id}`,
    method: 'put',
    data,
  });
}

/** Delete point task */
export function fetchDeletePointTask(id: string) {
  return request({
    url: `/admin/marketing/points/tasks/${id}`,
    method: 'delete',
  });
}

/** Get points accounts list (admin) */
export function fetchGetPointsAccounts(params?: { pageNum?: number; pageSize?: number; memberId?: string }) {
  return request<Common.PaginatingQueryRecord<Api.Marketing.PointsAccount>>({
    url: '/admin/marketing/points/accounts',
    method: 'get',
    params,
  });
}

/** Adjust member points (admin) */
export function fetchAdjustPoints(data: { memberId: string; amount: number; type: string; remark?: string }) {
  return request({
    url: '/admin/marketing/points/adjust',
    method: 'post',
    data,
  });
}

/** Get points transactions (admin) */
export function fetchGetPointsTransactions(params?: Api.Marketing.PointsTransactionSearchParams) {
  return request<Common.PaginatingQueryRecord<Api.Marketing.PointsTransaction>>({
    url: '/admin/marketing/points/transactions',
    method: 'get',
    params,
  });
}

/** Get points earn statistics */
export function fetchGetPointsEarnStatistics(params?: { startTime?: string; endTime?: string }) {
  return request<Api.Marketing.PointsEarnStatistics>({
    url: '/admin/marketing/points/statistics/earn',
    method: 'get',
    params,
  });
}

/** Get points use statistics */
export function fetchGetPointsUseStatistics(params?: { startTime?: string; endTime?: string }) {
  return request<Api.Marketing.PointsUseStatistics>({
    url: '/admin/marketing/points/statistics/use',
    method: 'get',
    params,
  });
}

/** Get points balance statistics */
export function fetchGetPointsBalanceStatistics() {
  return request<Api.Marketing.PointsBalanceStatistics>({
    url: '/admin/marketing/points/statistics/balance',
    method: 'get',
  });
}

/** Get points expire statistics */
export function fetchGetPointsExpireStatistics(params?: { startTime?: string; endTime?: string }) {
  return request({
    url: '/admin/marketing/points/statistics/expire',
    method: 'get',
    params,
  });
}

/** Get points ranking */
export function fetchGetPointsRanking(params?: { limit?: number }) {
  return request<{ ranking: Api.Marketing.PointsRankingItem[] }>({
    url: '/admin/marketing/points/ranking',
    method: 'get',
    params,
  });
}

/** Export points transactions */
export function fetchExportPointsTransactions(params?: {
  memberId?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
}) {
  return request<Blob>({
    url: '/admin/marketing/points/export',
    method: 'get',
    params,
    responseType: 'blob',
  });
}
