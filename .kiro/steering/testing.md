---
inclusion: fileMatch
fileMatchPattern: '**/*.spec.{ts,tsx,vue},**/*.test.{ts,tsx,vue},**/*.e2e-spec.ts,**/test/**/*.ts,**/e2e/**/*.ts'
---

# 测试规范

跨应用（backend、admin-web 等）的测试命名、目录结构、覆盖率、Mock 与 Fixture 约定。各应用具体测试框架（Jest / Vitest）以对应规则为准。

---

## 1. 命名约定

| 类型             | 命名                                 | 说明                     |
| ---------------- | ------------------------------------ | ------------------------ |
| 单元/组件        | `*.spec.ts`                          | 与源文件同目录           |
| 集成             | `*.integration.spec.ts`              | 放在 `test/integration/` |
| E2E (Jest)       | `*.e2e-spec.ts`                      | Backend                  |
| E2E (Playwright) | `*.spec.ts`                          | Admin-Web，放 `e2e/`     |
| 脚本式测试       | `*.flow.test.ts` 或 `scripts/xxx.ts` | 非 Jest 执行的独立脚本   |

**统一使用 `.spec.ts`**，避免 `.test.ts` 与 `.spec.ts` 混用。

---

## 2. 目录结构

| 测试类型  | 放置位置                                                       |
| --------- | -------------------------------------------------------------- |
| 单元      | 与源文件同目录 `xxx.service.spec.ts`                           |
| 集成      | `test/integration/*.integration.spec.ts`                       |
| E2E       | `test/*.e2e-spec.ts`（Backend）或 `e2e/*.spec.ts`（Admin-Web） |
| Fixture   | `test/fixtures/`                                               |
| 共享 Mock | `src/test-utils/mocks/` 或 `src/test/mocks/`                   |

---

## 3. Mock 规范

### 3.1 Backend (NestJS + Jest)

- **共享 Mock**：优先从 `src/test-utils/mocks/` 导入 `createPrismaMock`、`createRedisMock`、`createClsMock`。
- **注入方式**：`{ provide: XxxService, useValue: mockXxx }`。
- **清理**：`beforeEach` 中 `jest.clearAllMocks()`；有 `jest.spyOn` 时在 `afterEach` 中 `jest.restoreAllMocks()`。

### 3.2 Admin-Web (Vue + Vitest)

- **全局 Mock**：在 `src/test/setup.ts` 中 mock `window.$message`、`$t`、路由、Pinia 等。
- **组件 Mock**：`mount(Comp, { global: { mocks: { $t: vi.fn(), $message: { success: vi.fn() } } } })`。
- **API Mock**：优先使用 `vi.mock('@/service/api/xxx')` 或 MSW。

### 3.3 Mock 命名

- 变量：`mockPrisma`、`mockRedis`、`mockCls`。
- 工厂：`createPrismaMock()`、`createRedisMock()`、`createClsMock(tenantId?)`。

---

## 4. Fixture 规范

### 4.1 放置位置

- Backend：`apps/backend/test/fixtures/`。
- 导出：`test/fixtures/index.ts` 统一导出。

### 4.2 工厂函数

- 命名：`createTenantFixture()`、`createMemberFixture(opts?)`、`createOrderFixture(opts?)`。
- 返回：符合 Prisma 类型的对象，用于 `mockResolvedValue` 或 `prisma.xxx.create({ data: factory() })`。
- 覆盖：支持 `opts` 部分覆盖默认值。

### 4.3 使用场景

- **单元**：`mockRepo.findById.mockResolvedValue(createMemberFixture({ memberId: 'm1' }))`。
- **集成/E2E**：`await prisma.umsMember.create({ data: createMemberFixture({ tenantId: '00000' }) })`。

---

## 5. 覆盖率

- Backend：`collectCoverageFrom` 仅收集 `src/**/*.ts`，排除 `*.spec.ts`、`*.module.ts`。
- Admin-Web：排除 `src/**/*.spec.*`、`src/main.ts`、`locales`、`typings`。
- 阈值：分阶段设置，先 `statements: 60`、`branches: 50`。

---

## 6. PR 门禁与 CI

### 6.1 门禁检查项（按顺序）

| 序号 | 检查      | 命令             | 失败即阻断 |
| ---- | --------- | ---------------- | ---------- |
| 1    | Lint      | `pnpm lint`      | 是         |
| 2    | TypeCheck | `pnpm typecheck` | 是         |
| 3    | Test      | `pnpm test`      | 是         |
| 4    | Build     | `pnpm build`     | 是         |

PR 合并前，CI 中上述四项均须通过；任意一项失败即不可合并。

### 6.2 参与范围

- **lint**：backend、admin-web、miniapp-client（根 lint-staged 已配置）
- **typecheck**：有 typecheck 脚本的包（backend、admin-web 等）
- **test**：有 test 脚本的包（当前为 backend、admin-web；miniapp-client 无则跳过）
- **build**：所有需构建的应用

### 6.3 单点约定

- CI 配置统一在 `.github/workflows/ci.yml`。
- 新增应用时，若需参与门禁，须在对应 package.json 中声明 `lint`、`typecheck`、`test`、`build` 脚本，且根 lint-staged 已包含该应用路径。

---

## 7. 失败处理

### 7.1 CI 失败时

- **开发者**：本地复现（`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`），修复后重新推送。
- **不合并**：任意检查失败时，禁止合并 PR。

### 7.2 测试失败时

- **单元/集成**：修复用例或被测代码，确保 `pnpm test` 通过。
- **E2E**：若依赖环境（DB、Redis、账号）导致不稳定，可先在 CI 中临时跳过或隔离，并在 Issue 中跟踪修复。
- **覆盖率下降**：若配置了 coverageThreshold，未达标会失败；可放宽阈值或补测，需在 PR 中说明。

### 7.3 临时豁免

- 确需临时跳过某检查时，须在 PR 描述中**显式说明**原因、计划恢复时间，并经 Reviewer 同意。

---

## 8. Miniapp-Client 测试约定（若有需求时）

miniapp-client 当前无 test 脚本，不参与 `pnpm test`。若后续引入测试：

- **单元**：推荐 Vitest + `@vue/test-utils`，与 admin-web 保持一致。
- **命名**：`*.spec.ts`，与源文件同目录。
- **Mock**：uni API 用 `vi.mock('@dcloudio/uni-app')`；HTTP 用 `vi.mock('@/http/xxx')`。
- **package.json**：新增 `"test": "vitest"`、`"test:run": "vitest run"`，并配置 `vitest.config.ts`。
- **turbo**：自动参与 `pnpm test`（因 task 存在且包有 test 脚本）。
