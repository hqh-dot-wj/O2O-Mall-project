/**
 * Store 分销/商品 API 类型
 * 优先使用 OpenAPI components schemas
 */
import type { components, operations } from './api';

// ─── 商品相关 (来自 schema) ───

export type StoreProductVo = components['schemas']['StoreProductVo'];
export type StoreSkuVo = components['schemas']['StoreSkuVo'];
export type TenantProduct = StoreProductVo & {
  pointsRatio?: number;
  isPromotionProduct?: boolean;
};
export type TenantSku = StoreSkuVo;

export type ListStoreProductParams = components['schemas']['ListStoreProductDto'];

export type ImportSkuParams = components['schemas']['ImportSkuDto'];
export type ProductImportParams = components['schemas']['ImportProductDto'];
export type BatchImportProductDto = components['schemas']['BatchImportProductDto'];

export type ProductPriceUpdateParams = components['schemas']['UpdateProductPriceDto'];
export type ProductBaseUpdateParams = components['schemas']['UpdateProductBaseDto'];

// ─── 市场商品 ───

export type MarketProductVo = components['schemas']['MarketProductVo'];
export type MarketProductDetailVo = components['schemas']['MarketProductDetailVo'];
export type MarketProduct = MarketProductDetailVo;

export type MarketSearchParams = components['schemas']['ListMarketProductDto'];

// ─── 分销配置 ───

export type DistributionConfig = components['schemas']['DistConfigVo'];
export type DistributionConfigUpdateParams = components['schemas']['UpdateDistConfigDto'];
export type UpdateDistributionConfigDto = DistributionConfigUpdateParams;
export type DistributionConfigLog = components['schemas']['DistConfigLogVo'];

// ─── 等级体系 ───

export type Level = components['schemas']['LevelVo'];
export type CreateLevelDto = components['schemas']['CreateLevelDto'];
export type UpdateLevelDto = components['schemas']['UpdateLevelDto'];
export type UpdateMemberLevelDto = components['schemas']['UpdateMemberLevelDto'];
export type MemberLevelLog = components['schemas']['MemberLevelLogVo'];
export type LevelCheck = components['schemas']['LevelCheckVo'];

export interface LevelUpgradeCondition {
  minOrderCount?: number;
  minOrderAmount?: number;
  minSelfAmount?: number;
  minDirectSubCount?: number;
  minTeamCount?: number;
}

// ─── 分销员申请 ───

export type Application = components['schemas']['ApplicationVo'] & {
  member?: { nickname: string; avatar?: string; mobile?: string };
  reason?: string;
  auditTime?: string;
  auditor?: string;
};
export type ReviewApplicationDto = components['schemas']['ReviewApplicationDto'];
export type BatchReviewDto = components['schemas']['BatchReviewDto'];
export type ReviewConfig = components['schemas']['ReviewConfigVo'];
export type UpdateReviewConfigDto = components['schemas']['UpdateReviewConfigDto'];

// ─── 看板/商品配置 ───

export type Dashboard = components['schemas']['DashboardVo'];
export type DistributorStats = components['schemas']['DistributorStatsVo'];
export type OrderStats = components['schemas']['OrderStatsVo'];
export type ProductConfig = components['schemas']['ProductConfigVo'];
export type CreateProductConfigDto = components['schemas']['CreateProductConfigDto'];
export type UpdateProductConfigDto = components['schemas']['UpdateProductConfigDto'];
export type BatchImportProductConfigDto = components['schemas']['BatchImportProductConfigDto'];

export type ProductConfigSearchParams = NonNullable<
  operations['DistributionController_getProductConfigList']['parameters']['query']
>;
export type LevelSearchParams = NonNullable<
  operations['DistributionController_getLevelList']['parameters']['query']
>;
export type ListApplicationDto = NonNullable<
  operations['DistributionController_listApplications']['parameters']['query']
>;
export type ListMemberLevelLogDto = NonNullable<
  operations['DistributionController_getMemberLevelLogs']['parameters']['query']
>;

export interface GetDashboardDto {
  startDate?: string;
  endDate?: string;
}

// ─── 佣金预估 (来自 OpenAPI，与后端 CommissionPreviewDto/Vo 对齐) ───

export type CommissionPreviewDto = components['schemas']['CommissionPreviewDto'];
export type CommissionPreviewVo = components['schemas']['CommissionPreviewVo'];
