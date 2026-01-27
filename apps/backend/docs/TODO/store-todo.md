# Store Module Refactoring TODO

Based on the code review performed on 2026-01-27, the `store` module is a complex aggregate of B-side functionalities. While some parts are well-separated, many sub-modules still lack architectural consistency.

## 1. Shop Order Sub-module (`order`)

- [ ] **Data Mapping Overload**: `StoreOrderService.findAll` [L91](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/store/order/store-order.service.ts#L91) and `findOne` [L211](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/store/order/store-order.service.ts#L211) contain heavy manual data mapping and calculation (e.g., commissions, tenant names).
    - [ ] Encapsulate these into a dedicated `StoreOrderVo` or a helper/sub-service.
- [ ] **Cross-Module Dependency**: Direct usage of `commissionService` and `srvWorker` is fine, but ensure these are properly through interfaces if cross-module boundaries tighten.
- [ ] **Pagination Helper**: Use standardized `PaginationHelper` for consistent pagination handling.

## 2. Shop Product Sub-module (`product`)

- [ ] **Missing Repository Layer**: `StoreProductService` directly interacts with `PrismaService` for `pmsProduct`, `pmsTenantProduct`, and `pmsTenantSku`.
    - [ ] Create `TenantProductRepository` and `TenantSkuRepository`.
- [ ] **Manual Transaction Blocks**: `importProduct` [L133](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/store/product/product.service.ts#L133) uses manual `$transaction`.
    - [ ] Refactor to use `@Transactional()` decorator.
- [ ] **Profit Risk Logic**: The risk calculation [L244-L261](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/store/product/product.service.ts#L244-261) is excellent but should be unit-tested or moved to a utility if reused.
- [ ] **Missing VO Layers**: While a `vo` folder exists, ensure all `findAll` methods return normalized VOs instead of manual maps [L199](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/store/product/product.service.ts#L199).

## 3. Shop Finance Sub-module (`finance`)

- [ ] **Service Bloat**: `StoreFinanceService` is exceptionally large (~16k+ bytes).
    - [ ] Audit for sub-service split (e.g., `SettlementService`, `StoreWalletService`).
- [ ] **Standard Structure**: Ensure `dto` and `vo` coverage for all finance operations.

## 4. General Improvements

- [ ] **Data Scope**: Store-side operations are heavily tenant-scoped. Ensure `TenantContext` is consistently used instead of passing `tenantId` manually where possible.
- [ ] **Consistency**: Align `product.service.ts` imports with the `src/` alias standard.
