/**
 * Api.Store - 来自 @libs/common-types
 */
import type {
  Application as ApplicationT,
  BatchImportProductConfigDto as BatchImportProductConfigDtoT,
  BatchReviewDto as BatchReviewDtoT,
  CommissionPreviewDto as CommissionPreviewDtoT,
  CommissionPreviewVo as CommissionPreviewVoT,
  CreateLevelDto as CreateLevelDtoT,
  CreateProductConfigDto as CreateProductConfigDtoT,
  Dashboard as DashboardT,
  DistributionConfigLog as DistributionConfigLogT,
  DistributionConfig as DistributionConfigT,
  DistributionConfigUpdateParams as DistributionConfigUpdateParamsT,
  DistributorStats as DistributorStatsT,
  GetDashboardDto as GetDashboardDtoT,
  ImportSkuParams as ImportSkuParamsT,
  LevelCheck as LevelCheckT,
  LevelSearchParams as LevelSearchParamsT,
  Level as LevelT,
  LevelUpgradeCondition as LevelUpgradeConditionT,
  ListApplicationDto as ListApplicationDtoT,
  ListMemberLevelLogDto as ListMemberLevelLogDtoT,
  ListStoreProductParams as ListStoreProductParamsT,
  MarketProduct as MarketProductT,
  MarketSearchParams as MarketSearchParamsT,
  MemberLevelLog as MemberLevelLogT,
  OrderStats as OrderStatsT,
  ProductBaseUpdateParams as ProductBaseUpdateParamsT,
  ProductConfigSearchParams as ProductConfigSearchParamsT,
  ProductConfig as ProductConfigT,
  ProductImportParams as ProductImportParamsT,
  ProductPriceUpdateParams as ProductPriceUpdateParamsT,
  ReviewApplicationDto as ReviewApplicationDtoT,
  ReviewConfig as ReviewConfigT,
  TenantProduct as TenantProductT,
  TenantSku as TenantSkuT,
  UpdateDistributionConfigDto as UpdateDistributionConfigDtoT,
  UpdateLevelDto as UpdateLevelDtoT,
  UpdateMemberLevelDto as UpdateMemberLevelDtoT,
  UpdateProductConfigDto as UpdateProductConfigDtoT,
  UpdateReviewConfigDto as UpdateReviewConfigDtoT
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
    type CommissionPreviewDto = CommissionPreviewDtoT;
    type CommissionPreview = CommissionPreviewVoT;

    type ProductConfig = ProductConfigT;
    type CreateProductConfigDto = CreateProductConfigDtoT;
    type UpdateProductConfigDto = UpdateProductConfigDtoT;
    type ProductConfigSearchParams = ProductConfigSearchParamsT;
    type BatchImportProductConfigDto = BatchImportProductConfigDtoT;
  }
}
