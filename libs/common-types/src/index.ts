import type { components, paths } from './api';

export * from './enum';
export * from './api';

/**
 * 🛰️ 请求响应通用映射
 */
export type ApiResult<T> = components["schemas"]["Result"] & { data: T };

/**
 * 📄 分页响应通用映射
 * 假设后端分页结构为 { list: T[], total: number }
 */
export type ApiPageResult<T> = ApiResult<{
  list: T[];
  total: number;
}>;

/**
 * 🔍 获取路径参数的工具类型
 * Usage: type Params = RequestParams<"/system/user/list", "get">
 */
export type RequestParams<
  P extends keyof paths,
  M extends keyof paths[P] & string
> = paths[P][M] extends { parameters: { query?: infer Q } } ? Q : never;

/**
 * 📦 业务实体别名 (推荐在这里统一维护常用实体名)
 * 这样业务代码就不需要关心后端原始的 DTO/VO 命名习惯 (比如 Vo/Dto 后缀)
 */

// 系统管理
export type User = components["schemas"]["UserVo"];
export type Role = components["schemas"]["RoleVo"];
export type Dept = components["schemas"]["DeptVo"];
export type Menu = components["schemas"]["MenuVo"];
export type Config = components["schemas"]["ConfigVo"];

// 常用查询参数
export type ConfigQueryParams = RequestParams<"/api/system/config/list", "get"> & components["schemas"]["ListConfigDto"];
export type UserQueryParams = RequestParams<"/api/system/user/list", "get"> & components["schemas"]["ListUserDto"];

// ─── Client 端 (miniapp-client) ───

// 商品
export type ClientProduct = components["schemas"]["ClientProductVo"];
export type ClientProductDetail = components["schemas"]["ClientProductDetailVo"];
export type ClientCategory = components["schemas"]["ClientCategoryVo"];

// 订单
export type CreateOrderParams = components["schemas"]["CreateOrderDto"];
export type OrderDetail = components["schemas"]["OrderDetailVo"];
export type OrderListItem = components["schemas"]["OrderListItemVo"];
export type OrderItem = components["schemas"]["OrderItemVo"];
export type OrderItemInput = components["schemas"]["OrderItemDto"];

// 购物车
export type CartItem = components["schemas"]["CartItemVo"];
export type CartList = components["schemas"]["CartListVo"];
export type AddCartParams = components["schemas"]["AddCartDto"];

// 地址
export type CreateAddressParams = components["schemas"]["CreateAddressDto"];
export type UpdateAddressParams = components["schemas"]["UpdateAddressDto"];

// 用户 (C端)
export type ClientUser = components["schemas"]["ClientUserVo"];

// 分销
export type CommissionPreview = components["schemas"]["CommissionPreviewVo"];

// ─── Store 端 (admin-web store 模块) ───

export type {
  StoreOrderSearchParams,
  StoreOrderListItemVo,
  StoreOrderItemVo,
  StoreOrderDetailVo,
} from './store-order';

// ─── Finance (admin-web finance 模块) ───

export type {
  CommissionSearchParams,
  WithdrawalSearchParams,
  LedgerSearchParams,
  CommissionStatus,
  WithdrawalStatus,
  TransType,
  FinanceDashboardVo,
  CommissionRecordVo,
  WithdrawalRecordVo,
  StoreCommissionStatsVo,
  LedgerRecordVo,
  LedgerStatsVo,
} from './finance';

// ─── Store 分销/商品 (admin-web store 模块) ───

export type {
  StoreProductVo,
  StoreSkuVo,
  TenantProduct,
  TenantSku,
  ListStoreProductParams,
  ImportSkuParams,
  ProductImportParams,
  BatchImportProductDto,
  ProductPriceUpdateParams,
  ProductBaseUpdateParams,
  MarketProductVo,
  MarketProductDetailVo,
  MarketProduct,
  MarketSearchParams,
  DistributionConfig,
  DistributionConfigUpdateParams,
  UpdateDistributionConfigDto,
  DistributionConfigLog,
  Level,
  CreateLevelDto,
  UpdateLevelDto,
  UpdateMemberLevelDto,
  MemberLevelLog,
  LevelCheck,
  LevelUpgradeCondition,
  Application,
  ReviewApplicationDto,
  BatchReviewDto,
  ReviewConfig,
  UpdateReviewConfigDto,
  ProductConfigSearchParams,
  LevelSearchParams,
  ListApplicationDto,
  ListMemberLevelLogDto,
  Dashboard,
  DistributorStats,
  OrderStats,
  ProductConfig,
  CreateProductConfigDto,
  UpdateProductConfigDto,
  BatchImportProductConfigDto,
  GetDashboardDto,
  CommissionPreviewDto,
  CommissionPreviewVo,
} from './store';

// ─── Store 库存 ───

export type {
  StockSkuVo,
  StockSearchParams,
  StockUpdateParams,
  BatchUpdateStockParams,
  BatchUpdateStockResult,
} from './store-stock';

// ─── PMS 属性 ───

export type {
  AttrUsageType,
  AttrInputType,
  AttrApplyType,
  AttributeItemVo,
  AttributeTemplateVo,
  AttributeSearchParams,
  AttributeOperateParams,
} from './pms-attribute';
