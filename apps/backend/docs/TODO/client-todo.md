# Client Module (C-End API) Refactoring TODO

The `client` module handles critical high-traffic C-end APIs. Current review confirms significant architectural gaps and opportunities for optimization.

## 📍 Phase 1: Foundation (Repositories)
- [ ] **[NEW] OrderRepository**: Encapsulate order queries, status updates, and soft deletes.
- [ ] **[NEW] CartRepository**: Encapsulate cart item upsert, batch query, and cleanup logic.
- [ ] **[NEW] AddressRepository**: Encapsulate address CRUD and "default address" toggle logic.
- [ ] **[NEW] ClientProductRepository**: Encapsulate complex product/SKU/tenant association queries.
- [ ] **Dependency Injection**: Replace direct `PrismaService` usage in Services with new Repositories.

## 🚀 Phase 2: Service Decomposition
- [ ] **[NEW] OrderCheckoutService**: Extract `getCheckoutPreview` logic (LBS, Inventory Check, Pricing).
- [ ] **[NEW] AttributionService**: Extract referral attribution logic (Redis tracking, Relationship binding).
- [ ] **[MODIFY] OrderService**: Refactor `createOrder` to use the Facade pattern, orchestrating sub-services.
- [ ] **[MODIFY] PaymentService**: Remove Mock implementation, standardize payment parameter construction.

## ⚡ Phase 3: Performance & Concurrency
- [ ] **[OPTIMIZE] ClientProductService**: Fix N+1 issue in `findOne` using `Promise.all` or parallel/batch fetching.
- [ ] **[CACHE] ClientProductService**: Implement Redis caching (`@Cacheable`) for `findAll` and `findOne`.
- [ ] **[LOCK] ServiceSlotService**: Implement distributed lock (Redis) in `lockSlot` to prevent overbooking.

## 🛡️ Phase 4: Standardization
- [ ] **Localization**: Audit all Services to ensure `BusinessException` messages are in **Simplified Chinese**.
- [ ] **Documentation**: Add JSDoc comments in **Chinese** for all exported Service methods.
