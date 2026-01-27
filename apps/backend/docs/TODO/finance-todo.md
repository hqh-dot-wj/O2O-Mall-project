# Finance Module Refactoring TODO

Based on the code review performed on 2026-01-27, the following issues were identified in the `apps/backend/src/module/finance` module.

## 1. Withdrawal Sub-module

- [ ] **Controller Logic Cleanup**: Move tenant ID resolution and permission logic from `WithdrawalController` to the Service layer or use a dedicated decorator.
- [ ] **Service Decomposition**: Split `WithdrawalService` into sub-services:
    - `WithdrawalAuditService`: Handle audit status transitions and strategies.
    - `WithdrawalPaymentService`: Handle interaction with external payment providers (e.g., WeChat Pay).
- [ ] **Repository Consistency**: Ensure all database operations use `WithdrawalRepository` or appropriate repositories instead of direct Prisma calls.
- [ ] **Strategy Pattern Optimization**: Move audit strategies into separate classes or the new `WithdrawalAuditService`.

## 2. Wallet Sub-module

- [ ] **Standardize Folder Structure**: Create `dto` and `vo` directories.
- [ ] **Implement DTOs**: Create `GetWalletDto`, `UpdateWalletDto` etc., to validate inputs.
- [ ] **Implement VOs**: Create `WalletVo` to normalize API responses and hide internal fields like `version`.
- [ ] **Repository Isolation**:
    - [ ] Create `WalletRepository` and `TransactionRepository` if they don't fully exist (or migrate logic to them).
    - [ ] Stop direct `prisma.finWallet` calls in `WalletService`.
- [ ] **Transactional Consistency**: Replace manual `tx` passing with the `@Transactional()` decorator to align with the project standard.

## 3. General Finance Module

- [ ] **Missing Caching**: Evaluate and implement `@Cacheable` for frequently accessed data like wallet balances (with proper eviction).
- [ ] **Data Scope**: Verify if `DataScope` logic should be applied to finance records (e.g., can a branch admin see all branch withdrawals?).
