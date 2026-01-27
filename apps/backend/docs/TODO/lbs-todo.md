# LBS Module Refactoring TODO

Based on the code review performed on 2026-01-27, the `apps/backend/src/module/lbs` module deviates significantly from the project's standard architecture and contains critical security risks.

## 1. Critical Security Risks (SQL Injection)

- [x] **Fix Geo Queries**: `GeoService.findStationByPoint` and `StationService.create/upsertMainStation` switched from `$queryRawUnsafe` to parameterized `$queryRaw`.

## 2. Architectural Gaps (Missing Layers)

- [ ] **Lack of Repositories**: Currently, Services directly interact with `PrismaService`.
    - [ ] Create `RegionRepository`.
    - [ ] Create `StationRepository`.
    - [ ] Create `GeoFenceRepository`.
- [ ] **Missing DTO/VO Layers**: All sub-modules (`region`, `station`) lack these.
    - [ ] Implement `CreateStationDto`, `UpdateStationDto`.
    - [ ] Implement `StationVo`, `RegionVo` (to hide raw DB IDs and internal fields).
- [ ] **Module Structure**: Standardize folders to include `dto`, `vo`, and `repository` for each sub-module.

## 3. Implementation Improvements

- [ ] **Station Logic Refinement**:
    - [ ] Move fence creation/update logic into `GeoFenceRepository`.
    - [ ] Add `@Transactional()` to `StationService.create` and `upsertMainStation`.
- [ ] **Region Performance**:
    - [ ] `RegionService.getTree` is currently empty. Implement an efficient tree-building logic or clarify lazy-loading strategy.
    - [ ] Optimize `onModuleInit` seeding logic; consider moving seeding to a dedicated migration script or CLI command instead of every app start.
- [ ] **Hardcoded Paths**: `RegionService.seedRegions` [L25-L29](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/lbs/region/region.service.ts#L25-29) uses multiple relative path probes. Standardize where `pcas-code.json` resides and use a consistent path.

## 4. General Conventions

- [ ] **Inconsistent Imports**: `StationService` has relative imports like `../../../prisma/prisma.service`. Switch to alias `src/prisma/prisma.service`.
- [ ] **Missing Caching**: Region data is static and ideal for `@Cacheable`.
- [ ] **Data Scope**: Implement `DataScope` for `StationService.findAll` to restrict access based on user role/department.
