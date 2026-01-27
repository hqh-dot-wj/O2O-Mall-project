# Admin Member Module Refactoring TODO

Based on the code review performed on 2026-01-27, the `admin/member` module manages critical membership and distribution relationship data. The current implementation is heavily procedural and lacks the standardized layering found in the "Gold Standard" modules.

## 1. Core Architectural Issues

- [x] **Missing Repository Layer**: `MemberService` directly uses `PrismaService` for all operations.
    - [x] Create `MemberRepository` inheriting from `BaseRepository`.
- [x] **Service Bloat & Complexity**: `MemberService.list` is overly complex, performing multiple manual lookups for:
    - [x] Tenant info.
    - [x] Parent/Indirect parent info.
    - [x] Consumption stats via `groupBy`.
    - [x] Commission stats via `groupBy`.
    - [x] **Refactoring Plan**: Extract stats calculation to a `MemberStatsService` and referral lookups to the Repository or a dedicated `ReferralService`.
- [x] **Lack of DTO Validation**: `MemberController` uses `@Body() body: any` or anonymous objects.
    - [x] Implement proper class-validator based DTOs (e.g., `UpdateReferrerDto`, `UpdateTenantDto`).

## 2. Business Logic & Security

- [x] **Hardcoded Business Rules**: Level names and mappings are hardcoded.
    - [x] Move these to a `member.constant.ts` file or fetch from a configuration table.
- [x] **Missing Cross-cutting Concerns**: `MemberController` is missing:
    - [x] `@RequirePermission` decorators for all management actions.
    - [x] `@Operlog` decorators for sensitive data changes (Level, Parent, Status).
- [x] **Transaction Safety**: `updateLevel` and `updateParent` should use the `@Transactional()` decorator to ensure atomicity, especially when multiple related fields (parentId, indirectParentId) are updated.

## 3. General Improvements

- [x] **Alias Imports**: Use `src/` instead of relative paths for better portability.
- [x] **VO Mapping**: The mapping logic in `list` belongs in the VO layer or a dedicated mapper.
- [x] **N+1 Performance**: While bulk fetching is used, the overall complexity of the mapping still poses a risk as the list grows. Ensure indexes exist on `tenantId`, `parentId`, and `indirectParentId`.
- [x] **Missing Caching**: Member profile/level information could benefit from `@Cacheable` to reduce DB load on frequent lookups.
