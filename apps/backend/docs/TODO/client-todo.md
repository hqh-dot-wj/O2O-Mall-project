# Client Module (C-End API) Refactoring TODO

Based on the code review performed on 2026-01-27, the `client` module handles critical high-traffic C-end APIs. While it implements complex features (Attribution, LBS, Marketing integration), it suffers from extreme service bloat and inconsistent layering.

## 1. Massive Service Bloat (`OrderService`)

- [ ] **Decompose `OrderService`**: Currently over 600 lines [L1](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/client/order/order.service.ts#L1) and handles:
    - [ ] LBS/Distance calculations -> Move to `LbsService`.
    - [ ] Attribution logic -> Move to `AttributionService` or `MemberService`.
    - [ ] Checkout Preview logic -> Extract to `CheckoutService`.
    - [ ] Order Status Transitions -> Use a specialized state manager or sub-service.
- [ ] **Standardize Transaction Decorators**: Replace manual logic if any remains with the `@Transactional()` decorator.

## 2. Product Aggregation (`ClientProductService`)

- [ ] **Logic Duplication**: Category tree building [L368](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/client/product/product.service.ts#L368) is duplicated from the PMS module.
    - [ ] Reuse the `CategoryService` from the `pms` module or a shared service.
- [ ] **Missing Repository Layer**: Direct `PrismaService` calls for `pmsTenantProduct`, `pmsTenantSku`, etc.
    - [ ] Implement `TenantProductRepository` and `TenantSkuRepository` or share them with the `store` module.

## 3. General Architectural Gaps

- [ ] **Lack of Repositories**: Most sub-modules (Address, Cart, Upgrade) directly use `PrismaService`.
    - [ ] Implement repositories for all entities.
- [ ] **Hardcoded Formulas**: Haversine distance [L44](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/client/order/order.service.ts#L44) should be moved to a `GeoUtils` or `LbsService`.
- [ ] **Caching Strategy**: Highly critical for C-end Product lists and details.
    - [ ] Implement `@Cacheable` for `findAll` and `findOne` in `ClientProductService`.
- [ ] **N+1 Queries**: In `findOne` [L271](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/client/product/product.service.ts#L271), marketing configs are queried and then strategies are called in a loop.
    - [ ] Optimize these aggregations.

## 4. Security & Safety

- [ ] **LBS Edge Cases**: Ensure `calcDistance` handles null coordinates gracefully without throwing.
- [ ] **Concurrency**: Validate that inventory deduction [L319](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/client/order/order.service.ts#L319) is safe under high concurrency (currently uses `updateMany` which is a good row-level lock approach).
