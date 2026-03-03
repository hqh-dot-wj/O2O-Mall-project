---
inclusion: fileMatch
fileMatchPattern: '{**/*.spec.ts,**/*.spec.tsx,**/*.spec.vue,**/*.test.ts,**/*.test.tsx,**/*.test.vue,**/*.e2e-spec.ts,**/test/**/*.ts,**/e2e/**/*.ts}'
---

# 测试规范

跨应用（backend、admin-web 等）的测试命名、目录结构、覆盖率、Mock 与 Fixture 约定。

## 0. 测试类型与必要性

### 0.1 项目已具备的测试

| 类型     | 工具                               | 说明                                                  |
| -------- | ---------------------------------- | ----------------------------------------------------- |
| 单元测试 | Jest (backend)、Vitest (admin-web) | `*.spec.ts` 与源文件同目录                            |
| 集成测试 | Jest                               | `test/integration/*.integration.spec.ts`              |
| E2E 测试 | Jest e2e、Playwright               | Backend: `test/*.e2e-spec.ts`；Admin: `e2e/*.spec.ts` |
| 静态分析 | ESLint、vue-tsc                    | `pnpm lint`、`pnpm typecheck`                         |

### 0.2 必要性分级

| 必要性   | 测试类型                                        | 说明                    |
| -------- | ----------------------------------------------- | ----------------------- |
| **必要** | 单元测试、集成测试、E2E 冒烟、ESLint、typecheck | CI 门禁，PR 必过        |
| **建议** | 组件测试、关键流程 E2E                          | 核心业务/复杂组件优先补 |
| **可选** | 快照、视觉回归、性能测试                        | 按需求引入              |

### 0.3 对接完成必做

| 完成内容                         | 必须执行                                                              |
| -------------------------------- | --------------------------------------------------------------------- |
| 新增/修改 API 接口               | 补充 `*.spec.ts`，运行 `pnpm test -- src/service/api/对应模块`        |
| 新增/修改后端 Controller/Service | 补充 `*.spec.ts`，运行 `pnpm --filter @apps/backend test -- 对应路径` |
| 新增页面或路由                   | 关键路由补充 E2E 冒烟                                                 |
| 修改核心业务逻辑                 | 确保相关单测/集成测通过                                               |

## 1. 命名约定

| 类型             | 命名                                           |
| ---------------- | ---------------------------------------------- |
| 单元/组件        | `*.spec.ts`（与源文件同目录）                  |
| 集成             | `*.integration.spec.ts`（`test/integration/`） |
| E2E (Jest)       | `*.e2e-spec.ts`                                |
| E2E (Playwright) | `*.spec.ts`（`e2e/`）                          |

**统一使用 `.spec.ts`**，避免 `.test.ts` 与 `.spec.ts` 混用。

## 2. 目录结构

| 测试类型  | 放置位置                                                       |
| --------- | -------------------------------------------------------------- |
| 单元      | 与源文件同目录 `xxx.service.spec.ts`                           |
| 集成      | `test/integration/*.integration.spec.ts`                       |
| E2E       | `test/*.e2e-spec.ts`（Backend）或 `e2e/*.spec.ts`（Admin-Web） |
| Fixture   | `test/fixtures/`                                               |
| 共享 Mock | `src/test-utils/mocks/` 或 `src/test/mocks/`                   |

## 3. Mock 规范

### 3.1 类型安全的 Mock（推荐，Backend）

Backend 提供类型安全测试辅助，位于 `src/common/types/test-helpers.types.ts`：

- **类型**：`MockRepository<T>`、`MockService<T>`、`PartialMock<T>`、`TestPaginatedResult<T>`、`TestPrismaClient`、`TestRedisClient`、`TestClsService`
- **函数**：`createMockRepository<T>()`、`createMockService<T>()`、`createTestPrismaClient()`、`createTestRedisClient()`、`createTestClsService()`、`expectAny`

### 3.2 Backend (NestJS + Jest)

- **共享 Mock**：优先从 `src/test-utils/mocks/` 导入。
- **注入方式**：`{ provide: XxxService, useValue: mockXxx }`。
- **清理**：`beforeEach` 中 `jest.clearAllMocks()`；有 `jest.spyOn` 时在 `afterEach` 中 `jest.restoreAllMocks()`。

### 3.3 Admin-Web (Vue + Vitest)

- **全局 Mock**：在 `src/test/setup.ts` 中 mock `window.$message`、`$t`、路由、Pinia 等。
- **API Mock**：优先使用 `vi.mock('@/service/api/xxx')` 或 MSW。

## 4. Fixture 规范

- 位置：`apps/backend/test/fixtures/`，统一导出 `test/fixtures/index.ts`。
- 工厂函数：`createTenantFixture()`、`createMemberFixture(opts?)`。
- 支持 `opts` 部分覆盖默认值。

## 5. 新增功能测试要求（必做）

| 类型               | 最低要求                                               |
| ------------------ | ------------------------------------------------------ |
| Service 新方法     | 至少 2 个用例：主路径成功 + 异常/边界                  |
| Controller 新端点  | 至少验证 `@RequirePermission` 装饰器存在且权限标识正确 |
| Scheduler 定时任务 | 至少验证 Cron 元数据 + 调用对应 Service 方法           |
| 批量操作           | 覆盖全部成功、部分失败两种场景                         |

### 5.1 流程规约驱动测试

涉及状态机、并发、金额计算、幂等性的 Service，必须先编写 Process Spec，为每条规则分配 Rule ID，再按 Rule ID 编写测试。测试命名使用 Given/When/Then 格式。详见 `process-testing.md`。

## 6. 覆盖率

- Backend：`collectCoverageFrom` 仅收集 `src/**/*.ts`，排除 `*.spec.ts`、`*.module.ts`。
- 阈值：分阶段设置，先 `statements: 60`、`branches: 50`。

## 7. PR 门禁与 CI

| 序号 | 检查      | 命令             | 失败即阻断 |
| ---- | --------- | ---------------- | ---------- |
| 1    | Lint      | `pnpm lint`      | 是         |
| 2    | TypeCheck | `pnpm typecheck` | 是         |
| 3    | Test      | `pnpm test`      | 是         |
| 4    | Build     | `pnpm build`     | 是         |

PR 合并前，CI 中上述四项均须通过。

## 8. 失败处理

- **CI 失败**：本地复现，修复后重新推送。任意检查失败禁止合并 PR。
- **测试失败**：修复用例或被测代码。E2E 依赖环境导致不稳定可先临时跳过并在 Issue 中跟踪。
- **临时豁免**：须在 PR 描述中显式说明原因、计划恢复时间，经 Reviewer 同意。
