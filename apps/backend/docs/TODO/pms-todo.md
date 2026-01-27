# PMS Module Refactoring TODO

Based on the code review performed on 2026-01-27, the `pms` module has a decent base structure but fails to leverage the project's core architectural advantages (Repositories, Decorators, etc.) consistently.

## 1. Core Architectural Issues

- [ ] **Lack of Repositories**: Most services (`BrandService`, `CategoryService`, `PmsProductService`) interact with `PrismaService` directly.
    - [ ] Create `ProductRepository`, `BrandRepository`, `CategoryRepository`, `AttributeRepository`.
- [ ] **Manual Transaction Management**: `PmsProductService.create/update` manually call `this.prisma.$transaction`.
    - [ ] Refactor to use the `@Transactional()` decorator for a cleaner and more consistent approach.
- [ ] **Service Bloat**: `PmsProductService` handles multiple entities (Product, SKU, AttrValues) in large methods.
    - [ ] Create sub-services if the logic for complex product types (e.g., service-based products) grows.

## 2. Sub-module Specific Issues

### Brand & Category
- [ ] **Pagination Logic**: `BrandService.findAll` [L11](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/pms/brand/brand.service.ts#L11) and `CategoryService.findAll` [L31](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/pms/category/category.service.ts#L31) manually calculate `skip` and handle pagination.
    - [ ] Use `PaginationHelper` and `Result.page` properly to match the system's standard.
- [ ] **Missing DTO/VO folders**: While the top-level `pms` folder has them, sub-folders like `brand` and `category` shouldIdeally have their own if they grow, or properly link to the main ones.

### Product Management
- [ ] **Manual Data Mapping**: `PmsProductService.findAll` [L131](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/pms/product.service.ts#L131) manually maps fields like `albumPics` and `publishStatus`.
    - [ ] Move this mapping logic to the VO layer or use a more automated approach (e.g., `FormatDateFields`).
- [ ] **Data Integrity**: `PmsProductService.create` [L82](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/pms/product.service.ts#L82) allows recording 'Unknown' if an attribute definition isn't found. This should probably throw a `BusinessException`.

## 3. General Improvements

- [ ] **Consistent Imports**: Use alias `src/` instead of relative paths like `../../../prisma/prisma.service`.
- [ ] **Missing Caching**: Static/slow-changing data like `Category tree` [L13](file:///c:/VueProject/Nest-Admin-Soybean/apps/backend/src/module/pms/category/category.service.ts#L13) is a prime candidate for `@Cacheable`.
- [ ] **Data Scope**: Does Product management need visibility restrictions based on Department/Tenant? If so, integrate `DataScope` logic.
