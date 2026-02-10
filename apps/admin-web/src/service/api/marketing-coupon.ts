import { request } from '@/service/request';

/** Marketing API - Coupon (admin prefix) */

/** Get coupon template list */
export function fetchGetCouponTemplateList(params?: Api.Marketing.CouponTemplateSearchParams) {
  return request<Api.Marketing.CouponTemplateList>({
    url: '/admin/marketing/coupon/templates',
    method: 'get',
    params
  });
}

/** Get coupon template detail */
export function fetchGetCouponTemplate(id: string) {
  return request<Api.Marketing.CouponTemplate>({
    url: `/admin/marketing/coupon/templates/${id}`,
    method: 'get'
  });
}

/** Create coupon template */
export function fetchCreateCouponTemplate(data: Api.Marketing.CouponTemplateCreate) {
  return request<Api.Marketing.CouponTemplate>({
    url: '/admin/marketing/coupon/templates',
    method: 'post',
    data
  });
}

/** Update coupon template */
export function fetchUpdateCouponTemplate(id: string, data: Api.Marketing.CouponTemplateUpdate) {
  return request<Api.Marketing.CouponTemplate>({
    url: `/admin/marketing/coupon/templates/${id}`,
    method: 'put',
    data
  });
}

/** Delete (deactivate) coupon template */
export function fetchDeleteCouponTemplate(id: string) {
  return request({
    url: `/admin/marketing/coupon/templates/${id}`,
    method: 'delete'
  });
}

/** Update coupon template status */
export function fetchUpdateCouponTemplateStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
  return request({
    url: `/admin/marketing/coupon/templates/${id}/status`,
    method: 'patch',
    data: { status }
  });
}

/** Manual distribute coupons to members */
export function fetchCouponDistributeManual(data: { templateId: string; memberIds: string[] }) {
  return request<{ count: number }>({
    url: '/admin/marketing/coupon/distribute/manual',
    method: 'post',
    data
  });
}

/** Get user coupons list (admin) */
export function fetchGetUserCoupons(params?: {
  memberId?: string;
  status?: string;
  pageNum?: number;
  pageSize?: number;
}) {
  return request<Common.PaginatingQueryRecord<Api.Marketing.UserCoupon>>({
    url: '/admin/marketing/coupon/user-coupons',
    method: 'get',
    params
  });
}

/** Get coupon usage records */
export function fetchGetCouponUsageRecords(params?: {
  memberId?: string;
  templateId?: string;
  startTime?: string;
  endTime?: string;
  pageNum?: number;
  pageSize?: number;
}) {
  return request<Common.PaginatingQueryRecord<Api.Marketing.CouponUsageRecord>>({
    url: '/admin/marketing/coupon/usage-records',
    method: 'get',
    params
  });
}

/** Get coupon statistics */
export function fetchGetCouponStatistics(params?: { templateId?: string }) {
  return request<Api.Marketing.CouponStatistics>({
    url: '/admin/marketing/coupon/statistics',
    method: 'get',
    params
  });
}

/** Export coupon usage records */
export function fetchExportCouponUsage(params?: {
  memberId?: string;
  templateId?: string;
  startTime?: string;
  endTime?: string;
}) {
  return request<Blob>({
    url: '/admin/marketing/coupon/export',
    method: 'get',
    params,
    responseType: 'blob'
  });
}
