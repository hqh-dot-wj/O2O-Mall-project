/**
 * Api.Store - 来自 @libs/common-types
 */
import type {
  TenantProduct as TenantProductT,
  TenantSku as TenantSkuT,
  ListStoreProductParams as ListStoreProductParamsT,
  ImportSkuParams as ImportSkuParamsT,
  ProductImportParams as ProductImportParamsT,
  ProductPriceUpdateParams as ProductPriceUpdateParamsT,
  ProductBaseUpdateParams as ProductBaseUpdateParamsT,
  MarketProduct as MarketProductT,
  MarketSearchParams as MarketSearchParamsT,
  DistributionConfig as DistributionConfigT,
  DistributionConfigUpdateParams as DistributionConfigUpdateParamsT,
  UpdateDistributionConfigDto as UpdateDistributionConfigDtoT,
  DistributionConfigLog as DistributionConfigLogT,
  Level as LevelT,
  CreateLevelDto as CreateLevelDtoT,
  UpdateLevelDto as UpdateLevelDtoT,
  LevelUpgradeCondition as LevelUpgradeConditionT,
  UpdateMemberLevelDto as UpdateMemberLevelDtoT,
  MemberLevelLog as MemberLevelLogT,
  LevelSearchParams as LevelSearchParamsT,
  ListMemberLevelLogDto as ListMemberLevelLogDtoT,
  Application as ApplicationT,
  ListApplicationDto as ListApplicationDtoT,
  ReviewApplicationDto as ReviewApplicationDtoT,
  BatchReviewDto as BatchReviewDtoT,
  ReviewConfig as ReviewConfigT,
  UpdateReviewConfigDto as UpdateReviewConfigDtoT,
  GetDashboardDto as GetDashboardDtoT,
  Dashboard as DashboardT,
  DistributorStats as DistributorStatsT,
  OrderStats as OrderStatsT,
  StoreCommissionPreviewDto as StoreCommissionPreviewDtoT,
  StoreCommissionPreview as StoreCommissionPreviewT,
  ProductConfig as ProductConfigT,
  CreateProductConfigDto as CreateProductConfigDtoT,
  UpdateProductConfigDto as UpdateProductConfigDtoT,
  ProductConfigSearchParams as ProductConfigSearchParamsT,
  BatchImportProductConfigDto as BatchImportProductConfigDtoT,
  LevelCheck as LevelCheckT,
} from '@libs/common-types';

declare namespace Api {
  namespace Store {
    type TenantProduct = TenantProductT;
    type TenantSku = TenantSkuT;
    type TenantProductList = Api.Common.PaginatingQueryRecord<TenantProductT>;
    type ListStoreProductParams = ListStoreProductParamsT;
    type ImportSkuParams = ImportSkuParamsT;
    type ProductImportParams = ProductImportParamsT;
    type ProductPriceUpdateParams = ProductPriceUpdateParamsT;
    type ProductBaseUpdateParams = ProductBaseUpdateParamsT;

    type MarketProduct = MarketProductT;
    type MarketProductList = Api.Common.PaginatingQueryRecord<MarketProductT>;
    type MarketSearchParams = MarketSearchParamsT;

    type DistributionConfig = DistributionConfigT;
    type DistributionConfigUpdateParams = DistributionConfigUpdateParamsT;
    type UpdateDistributionConfigDto = UpdateDistributionConfigDtoT;
    type DistributionConfigLog = DistributionConfigLogT;

    type Level = LevelT;
    type CreateLevelDto = CreateLevelDtoT;
    type UpdateLevelDto = UpdateLevelDtoT;
    type LevelUpgradeCondition = LevelUpgradeConditionT;
    type LevelSearchParams = LevelSearchParamsT;
    type ListLevelDto = LevelSearchParamsT;
    type UpdateMemberLevelDto = UpdateMemberLevelDtoT;
    type MemberLevelLog = MemberLevelLogT;
    type ListMemberLevelLogDto = ListMemberLevelLogDtoT;
    type LevelCheck = LevelCheckT;

    type Application = ApplicationT;
    type ListApplicationDto = ListApplicationDtoT;
    type ReviewApplicationDto = ReviewApplicationDtoT;
    type BatchReviewDto = BatchReviewDtoT;
    type ReviewConfig = ReviewConfigT;
    type UpdateReviewConfigDto = UpdateReviewConfigDtoT;

    type GetDashboardDto = GetDashboardDtoT;
    type Dashboard = DashboardT;
    type DistributorStats = DistributorStatsT;
    type OrderStats = OrderStatsT;
    type CommissionPreviewDto = StoreCommissionPreviewDtoT;
    type CommissionPreview = StoreCommissionPreviewT;

    type ProductConfig = ProductConfigT;
    type CreateProductConfigDto = CreateProductConfigDtoT;
    type UpdateProductConfigDto = UpdateProductConfigDtoT;
    type ProductConfigSearchParams = ProductConfigSearchParamsT;
    type BatchImportProductConfigDto = BatchImportProductConfigDtoT;
  }
}
