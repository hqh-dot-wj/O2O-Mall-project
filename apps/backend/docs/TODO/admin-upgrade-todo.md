# Admin Upgrade Module Refactoring TODO

Based on the code review performed on 2026-01-27, the `admin/upgrade` module handles critical distribution level upgrade approvals and manual adjustments. While it uses some modern patterns (like `$transaction`), it still falls short of the project's standard architecture.

## 1. Architectural Gaps

- [x] **Missing Repository Layer**: `AdminUpgradeService` directly uses `PrismaService` for `umsUpgradeApply` and `umsMember`.
    - [x] Create `UpgradeApplyRepository`.
- [x] **Manual Transaction Blocks**: `approve` and `manualLevel` rely on `this.prisma.$transaction`.
    - [x] Refactor to use the `@Transactional()` decorator.
- [x] **Limited DTO Usage**: While it has an `upgrade.dto.ts`, ensure all inputs are fully validated via `class-validator`.

## 2. Implementation Issues

- [x] **Logic Duplication**: Referral code generation and level name mapping are handled inside the service.
    - [x] Move referral code logic to a shared `ReferralService`.
    - [x] Move level names to a centralized `member.constant.ts`.
- [x] **Missing Cross-cutting Concerns**:
    - [x] Ensure all Controller methods have `@RequirePermission`.
    - [x] Add `@Operlog` to capture approval and manual adjustment actions.

## 3. General Improvements

- [x] **Tenant Scoping Consistency**: Ensure all queries consistently use `TenantContext` to prevent data leakage between tenants.
- [x] **VO Standardization**: Use dedicated VO classes for returned lists and stats instead of anonymous maps.
- [x] **Performance**: Caching for stats might be needed if the volume of applications becomes high.
