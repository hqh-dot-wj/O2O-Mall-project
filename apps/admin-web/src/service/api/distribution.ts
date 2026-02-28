import { request } from '@/service/request';

/**
 * 获取分销规则配置
 */
export function fetchGetDistributionConfig() {
  return request<Api.Store.DistributionConfig>({
    url: '/store/distribution/config',
    method: 'get'
  });
}

/**
 * 更新分销规则配置
 * @param data 配置数据
 */
export function fetchUpdateDistributionConfig(data: Api.Store.DistributionConfigUpdateParams) {
  return request({
    url: '/store/distribution/config',
    method: 'post',
    data
  });
}

/**
 * 获取分销规则变更历史
 * @param params 分页参数
 */
export function fetchGetDistributionConfigLogs(params?: Api.Common.PaginatingCommonParams) {
  return request<Api.Common.PaginatingQueryRecord<Api.Store.DistributionConfigLog>>({
    url: '/store/distribution/config/logs',
    method: 'get',
    params
  });
}

/**
 * 佣金预估 (前端提示用)
 * @param data 预估参数
 */
export function fetchGetCommissionPreview(data: Api.Store.CommissionPreviewDto) {
  return request<Api.Store.CommissionPreview>({
    url: '/store/distribution/commission/preview',
    method: 'post',
    data
  });
}

// ==================== 商品级分佣配置 ====================

/**
 * 创建商品级分佣配置
 */
export function fetchCreateProductConfig(data: Api.Store.CreateProductConfigDto) {
  return request<Api.Store.ProductConfig>({
    url: '/store/distribution/product-config',
    method: 'post',
    data
  });
}

/**
 * 更新商品级分佣配置
 */
export function fetchUpdateProductConfig(id: number, data: Api.Store.UpdateProductConfigDto) {
  return request<Api.Store.ProductConfig>({
    url: `/store/distribution/product-config/${id}`,
    method: 'put',
    data
  });
}

/**
 * 删除商品级分佣配置
 */
export function fetchDeleteProductConfig(id: number) {
  return request({
    url: `/store/distribution/product-config/${id}`,
    method: 'delete'
  });
}

/**
 * 查询商品级分佣配置列表
 */
export function fetchGetProductConfigList(params: Api.Store.ProductConfigSearchParams) {
  return request<Api.Common.PaginatingQueryRecord<Api.Store.ProductConfig>>({
    url: '/store/distribution/product-config/list',
    method: 'get',
    params
  });
}

/**
 * 查询单个商品级分佣配置
 */
export function fetchGetProductConfig(id: number) {
  return request<Api.Store.ProductConfig>({
    url: `/store/distribution/product-config/${id}`,
    method: 'get'
  });
}

/**
 * 批量导入商品级分佣配置
 */
export function fetchBatchImportProductConfig(data: Api.Store.BatchImportProductConfigDto) {
  return request({
    url: '/store/distribution/product-config/batch',
    method: 'post',
    data
  });
}

// ==================== 分销数据看板 ====================

/**
 * 获取分销数据看板
 */
export function fetchGetDistributionDashboard(params: Api.Store.GetDashboardDto) {
  return request<Api.Store.Dashboard>({
    url: '/store/distribution/dashboard',
    method: 'get',
    params
  });
}

// ==================== 分销员等级体系 ====================

/**
 * 创建等级配置
 */
export function fetchCreateLevel(data: Api.Store.CreateLevelDto) {
  return request<Api.Store.Level>({
    url: '/store/distribution/level',
    method: 'post',
    data
  });
}

/**
 * 更新等级配置
 */
export function fetchUpdateLevel(id: number, data: Api.Store.UpdateLevelDto) {
  return request<Api.Store.Level>({
    url: `/store/distribution/level/${id}`,
    method: 'put',
    data
  });
}

/**
 * 删除等级配置
 */
export function fetchDeleteLevel(id: number) {
  return request({
    url: `/store/distribution/level/${id}`,
    method: 'delete'
  });
}

/**
 * 查询等级列表（后端返回 { rows, total }）
 */
export function fetchGetLevelList(params?: Api.Store.LevelSearchParams) {
  return request<Api.Common.PaginatingQueryRecord<Api.Store.Level>>({
    url: '/store/distribution/level/list',
    method: 'get',
    params
  });
}

/**
 * 查询等级详情
 */
export function fetchGetLevel(id: number) {
  return request<Api.Store.Level>({
    url: `/store/distribution/level/${id}`,
    method: 'get'
  });
}

/**
 * 手动调整会员等级
 */
export function fetchUpdateMemberLevel(data: Api.Store.UpdateMemberLevelDto) {
  return request({
    url: '/store/distribution/member-level',
    method: 'post',
    data
  });
}

/**
 * 查询会员等级变更日志
 */
export function fetchGetMemberLevelLogs(params: Api.Store.ListMemberLevelLogDto) {
  return request<Api.Common.PaginatingQueryRecord<Api.Store.MemberLevelLog>>({
    url: '/store/distribution/member-level/logs',
    method: 'get',
    params
  });
}

/**
 * 检查会员升级条件
 */
export function fetchCheckLevelUpgrade(memberId: string) {
  return request<Api.Store.LevelCheck>({
    url: `/store/distribution/level/check/${memberId}`,
    method: 'get'
  });
}

// ==================== 分销员申请/审核 ====================

/**
 * 查询申请列表
 */
export function fetchGetApplicationList(params: Api.Store.ListApplicationDto) {
  return request<Api.Common.PaginatingQueryRecord<Api.Store.Application>>({
    url: '/store/distribution/application/list',
    method: 'get',
    params
  });
}

/**
 * 审核申请
 */
export function reviewApplication(id: number, data: Api.Store.ReviewApplicationDto) {
  return request({
    url: `/store/distribution/application/${id}/review`,
    method: 'post',
    data
  });
}

/**
 * 批量审核
 */
export function fetchBatchReview(data: Api.Store.BatchReviewDto) {
  return request({
    url: '/store/distribution/application/batch-review',
    method: 'post',
    data
  });
}

/**
 * 获取审核配置
 */
export function fetchGetReviewConfig() {
  return request<Api.Store.ReviewConfig>({
    url: '/store/distribution/application/config',
    method: 'get'
  });
}

/**
 * 更新审核配置
 */
export function fetchUpdateReviewConfig(data: Api.Store.UpdateReviewConfigDto) {
  return request({
    url: '/store/distribution/application/config',
    method: 'put',
    data
  });
}
