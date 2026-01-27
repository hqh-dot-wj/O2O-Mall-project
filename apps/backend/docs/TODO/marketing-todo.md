# Marketing Module Refactoring TODO

Based on the code review performed on 2026-01-27, the `marketing` module generally follows the standard template but has some inconsistencies in the `play` sub-module and direct database access.

## 1. Play Sub-module (Strategy Layer)

- [ ] **Lack of DTO/VO Standardization**: While `instance` has DTOs, the `play` strategies (e.g., `GroupBuyService`, `MemberUpgradeService`) often handle unstructured `any` data or pass data back to `PlayInstanceService`.
    - [ ] Define specific DTOs for each play type's input parameters.
    - [ ] Define DisplayData VOs for UI-specific strategy data.
- [ ] **Repository Layer Bypass**: `GroupBuyService.handleGroupUpdate` [L135](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/marketing/play/group-buy.service.ts#L135) and `finalizeGroup` [L163](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/marketing/play/group-buy.service.ts#L163) call `this.prisma.playInstance` directly.
    - [ ] Refactor to use `PlayInstanceRepository` for all instance updates.
- [ ] **Service Bloat**: Some logic in `PlayInstanceService` regarding funds (e.g., `creditToStore` [L126](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/marketing/instance/instance.service.ts#L126)) could be extracted to a `MarketingSettleService` if it grows.

## 2. General Improvements

- [ ] **Hardcoded Formulas**: `PlayInstanceService.creditToStore` [L136](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/marketing/instance/instance.service.ts#L136) has a hardcoded platform fee calculation `amount.mul(0.01)`.
    - [ ] Move fee configuration to `sys_config` or a dedicated settings table.
- [ ] **Transactional Safety**: Verify that `handlePaymentSuccess` (which triggers strategy hooks) is properly wrapped in a transaction if the hooks perform DB writes.
- [ ] **N+1 Queries**: In `finalizeGroup` [L173](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/marketing/play/group-buy.service.ts#L173), `transitStatus` is called in a loop.
    - [ ] Consider adding a `transitStatusBatch` method to `PlayInstanceService` to improve performance.

## 3. Standard Folder Compliance

- [ ] **Play Folder**: Create `dto` and `vo` directories within `play` if strategy-specific data models are defined.
- [ ] **Asset Module**: Check if `asset` module also needs `dto`/`vo` cleanup (similar to `wallet`).
