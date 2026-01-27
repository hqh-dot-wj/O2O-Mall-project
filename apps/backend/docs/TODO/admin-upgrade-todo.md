# Admin Upgrade Module Refactoring TODO

Based on the code review performed on 2026-01-27, the `admin/upgrade` module handles critical distribution level upgrade approvals and manual adjustments. While it uses some modern patterns (like `$transaction`), it still falls short of the project's standard architecture.

## 1. Architectural Gaps

- [ ] **Missing Repository Layer**: `AdminUpgradeService` directly uses `PrismaService` for `umsUpgradeApply` and `umsMember`.
    - [ ] Create `UpgradeApplyRepository`.
- [ ] **Manual Transaction Blocks**: `approve` [L78](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/admin/upgrade/admin-upgrade.service.ts#L78) and `manualLevel` [L131](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/admin/upgrade/admin-upgrade.service.ts#L131) rely on `this.prisma.$transaction`.
    - [ ] Refactor to use the `@Transactional()` decorator.
- [ ] **Limited DTO Usage**: While it has an `upgrade.dto.ts`, ensure all inputs are fully validated via `class-validator`.

## 2. Implementation Issues

- [ ] **Logic Duplication**: Referral code generation [L189](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/admin/upgrade/admin-upgrade.service.ts#L189) and level name mapping [L184](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/admin/upgrade/admin-upgrade.service.ts#L184) are handled inside the service.
    - [ ] Move referral code logic to a shared `ReferralService`.
    - [ ] Move level names to a centralized `member.constant.ts`.
- [ ] **Missing Cross-cutting Concerns**:
    - [ ] Ensure all Controller methods have `@RequirePermission`.
    - [ ] Add `@Operlog` to capture approval and manual adjustment actions.

## 3. General Improvements

- [ ] **Tenant Scoping Consistency**: Ensure all queries consistently use `TenantContext` to prevent data leakage between tenants [L27-L28](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/admin/upgrade/admin-upgrade.service.ts#L27-28).
- [ ] **VO Standardization**: Use dedicated VO classes for returned lists and stats instead of anonymous maps.
- [ ] **Performance**: Caching for stats [L167](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/admin/upgrade/admin-upgrade.service.ts#L167) might be needed if the volume of applications becomes high.
