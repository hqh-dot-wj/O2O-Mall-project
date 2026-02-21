# 测试命名、目录结构与覆盖率统一性分析

## 一、现状概览

| 维度      | Backend                                              | Admin-Web                    | Miniapp-Client |
| --------- | ---------------------------------------------------- | ---------------------------- | -------------- |
| 测试框架  | Jest                                                 | Vitest                       | 无             |
| 单元/组件 | `*.spec.ts`                                          | `*.spec.ts` / `*.test.ts`    | —              |
| E2E       | `*.e2e-spec.ts` + Jest                               | `e2e/*.spec.ts` + Playwright | —              |
| 单元放置  | 与源文件同目录 + `test/unit/`                        | 与源文件同目录               | —              |
| 集成放置  | `test/integration/` + `src/**/*.integration.spec.ts` | 无单独集成目录               | —              |
| 覆盖率    | 有，无阈值                                           | 有，无阈值                   | —              |

---

## 二、命名问题

### 2.1 Backend

| 类型              | 当前命名                                         | 配置                                                           | 问题                                  |
| ----------------- | ------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------- |
| 单元              | `*.spec.ts`                                      | jest `testRegex: .*\.spec\.ts$`                                | 符合                                  |
| 集成（test 目录） | `*.spec.ts`                                      | jest-integration `testMatch: **/test/integration/**/*.spec.ts` | 与单元同名，无后缀区分                |
| 集成（src 内）    | `*.integration.spec.ts`                          | 被主 jest 跑，当作单元                                         | 名称为集成，实际与单元混跑            |
| E2E               | `*.e2e-spec.ts`                                  | jest-e2e `testRegex: .e2e-spec.ts$`                            | 符合                                  |
| 脚本式 E2E        | `e2e-marketing-flow.test.ts`                     | 经 `ts-node` 直接执行                                          | 与 jest-e2e 命名/运行方式不同，易混淆 |
| 主题/场景         | `*.property.spec.ts`、`*.anti-arbitrage.spec.ts` | 主 jest                                                        | 无规范，各写各的后缀                  |

### 2.2 Admin-Web

| 类型      | 当前命名                   | 配置                                                | 问题                           |
| --------- | -------------------------- | --------------------------------------------------- | ------------------------------ |
| 单元/组件 | `*.spec.ts` 或 `*.test.ts` | vitest `include: src/**/*.{spec,test}.{ts,tsx,vue}` | 双后缀并存，无统一标准         |
| E2E       | `*.spec.ts`                | Playwright `e2e/*.spec.ts`                          | 与单测同用 `.spec`，靠目录区分 |

### 2.3 命名统一建议

| 规则       | 建议                                                         | 理由                                       |
| ---------- | ------------------------------------------------------------ | ------------------------------------------ |
| 单元/组件  | **统一 `*.spec.ts`**                                         | 与 backend 一致，减少心智负担              |
| 集成       | `*.integration.spec.ts`                                      | 后缀明确，便于筛选                         |
| E2E        | `*.e2e-spec.ts`（Jest） / `*.spec.ts`（Playwright，放 e2e/） | Backend 保持现状；admin-web E2E 靠目录区分 |
| 脚本式测试 | `*.flow.test.ts` 或迁移为 jest e2e                           | 与 jest e2e 区隔，避免混入主 test 命令     |

---

## 三、目录结构问题

### 3.1 Backend 结构现状

```
apps/backend/
├── src/
│   └── module/
│       ├── marketing/
│       │   ├── coupon/
│       │   │   ├── coupon.integration.spec.ts    # 与源文件同级，主 jest 跑
│       │   │   └── template/
│       │   │       └── template.service.spec.ts # 单元
│       │   └── points/
│       │       └── points.integration.spec.ts
│       └── finance/
│           └── finance.integration.spec.ts
└── test/
    ├── unit/                                    # 部分单元单独集中
    │   ├── points-account.service.spec.ts
    │   ├── coupon-template.service.spec.ts
    │   ├── coupon-usage.property.spec.ts
    │   └── points-rule.property.spec.ts
    ├── integration/
    │   ├── points-flow.spec.ts
    │   ├── coupon-flow.spec.ts
    │   └── order-integration.spec.ts
    ├── app.e2e-spec.ts
    ├── business-flow.e2e-spec.ts
    ├── marketing.e2e-spec.ts
    └── e2e-marketing-flow.test.ts               # 脚本式，非 jest
```

**问题：**

1. **单元双源**：多数单元在 `src/**/*.spec.ts`，少数在 `test/unit/`，无统一标准。
2. **集成双源**：`test/integration/*.spec.ts` 与 `src/**/*.integration.spec.ts` 并存，职责重叠。
3. **`test/unit/` 存在理由不明**：可能是历史迁移遗留或特殊用例，需明确是否保留。

### 3.2 Admin-Web 结构现状

```
apps/admin-web/
├── src/
│   ├── utils/
│   │   └── common.spec.ts          # 单元，与源同目录
│   └── **/*.spec.{ts,tsx,vue}       # 与源文件同目录
└── e2e/
    └── smoke.spec.ts               # E2E
```

**问题：** 结构清晰，仅需统一命名（.spec vs .test）。

### 3.3 目录统一建议

| 规则         | 建议                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend 单元 | **与源文件同目录** `xxx.service.spec.ts`，逐步迁移 `test/unit/` 内的用例到源旁                                                                   |
| Backend 集成 | **集中到 `test/integration/`**，迁移 `src/**/*.integration.spec.ts` 到此处，统一命名 `xxx-flow.integration.spec.ts` 或 `xxx.integration.spec.ts` |
| Backend E2E  | 保持在 `test/*.e2e-spec.ts`，脚本式 `e2e-marketing-flow.test.ts` 保留或重命名为 `scripts/e2e-marketing-flow.ts` 以区分                           |
| Admin-Web    | 维持现有结构，单元与源同目录，E2E 在 `e2e/`                                                                                                      |

---

## 四、覆盖率问题

### 4.1 现状

| 应用                  | 收集范围                                          | 输出目录              | 阈值          |
| --------------------- | ------------------------------------------------- | --------------------- | ------------- | --- |
| Backend (jest)        | `\*_/_.(t                                         | j)s`（含 test、配置） | `../coverage` | 无  |
| Backend (integration) | 仅 marketing 的 service/controller                | `./coverage`          | 无            |
| Admin-Web (vitest)    | `src/**` 排除 spec/test/main/d.ts/locales/typings | 默认                  | 无            |

### 4.2 问题

1. **Backend jest**：覆盖了 test 目录和配置，拉高/失真覆盖率。
2. **Backend integration**：单独 coverage，与主 jest 不合并，且范围过窄。
3. **无阈值**：CI/PR 无法强制覆盖率。

### 4.3 覆盖率统一建议

| 项目                        | 建议                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| Backend collectCoverageFrom | 排除 `test/**`、`**/*.spec.ts`、`**/*.e2e-spec.ts`、`**/node_modules/**`，只收集 `src/**/*.ts` |
| 输出目录                    | 统一为 `coverage/`（项目内），或在根 `coverage/backend`、`coverage/admin-web`                  |
| 阈值                        | 分阶段设：先 statements 60%、branches 50%，后续按模块上调                                      |
| Admin-Web                   | 已较合理，可补充 `lines`/`statements`/`branches` 阈值                                          |

---

## 五、Mock 与 Fixture 现状及规范

### 5.1 现状

| 维度           | Backend                                                           | Admin-Web                      |
| -------------- | ----------------------------------------------------------------- | ------------------------------ |
| **Mock 工具**  | 仅有 `src/test-utils/prisma-mock.ts`（`createPrismaMock`）        | 无共享 mock，setup.ts 几乎为空 |
| **使用范围**   | system.services、monitor.services 等少数 spec 使用                | —                              |
| **多数用例**   | 内联 `jest.fn()`、`useValue: { ... }`，逐文件手写                 | 纯逻辑测试为主，mock 需求少    |
| **Fixture**    | 无共享 fixture 目录，测试数据在 `beforeAll`/`beforeEach` 内联创建 | 无                             |
| **Redis Mock** | `createRedisMock` 仅在 dept.service.spec 内定义，未提取           | —                              |
| **ClsService** | 各 spec 各自 `{ get: jest.fn().mockReturnValue('xxx') }`          | —                              |

### 5.2 问题

1. **Mock 重复**：Prisma、Redis、ClsService、各类 Repository 的 mock 在多个 spec 中重复构造，维护成本高。
2. **无共享 Fixture**：集成/E2E 的测试数据（租户、用户、订单、优惠券等）各自创建，无统一 seed 或 factory。
3. **类型不一致**：内联 mock 多用 `as any`，易与真实接口脱节。
4. **Admin-Web**：缺少对 `$message`、`$t`、路由、Pinia 等的全局 mock 约定，组件测试易踩坑。

### 5.3 Mock 规范建议

| 层级                    | 内容                                                                                                                  | 放置位置                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Backend 共享 Mock**   | `createPrismaMock`（已有）、`createRedisMock`、`createClsMock(tenantId?)`                                             | `apps/backend/src/test-utils/mocks/`                          |
| **Backend 模块 Mock**   | 某模块专用的 Repository/Service mock 工厂                                                                             | 该模块下 `__mocks__/` 或 `test-utils/mocks/{module}-mocks.ts` |
| **Admin-Web 共享 Mock** | `createMessageMock`、`createRouterMock`、`createPiniaMock`                                                            | `apps/admin-web/src/test/mocks/`                              |
| **Mock 注入约定**       | Nest 使用 `{ provide: X, useValue: mockX }`；Vitest 使用 `vi.mock()` 或 `mount(Comp, { global: { mocks: { ... } } })` | 写入 testing.mdc                                              |

### 5.4 Fixture 规范建议

| 类型                     | 内容                                                                          | 放置位置                                                        |
| ------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Backend 基础 Fixture** | 租户、成员、SKU、优惠券模板等最小可复用实体                                   | `apps/backend/test/fixtures/` 或 `test/shared/fixtures.ts`      |
| **Factory 函数**         | `createTenantFixture()`、`createMemberFixture()`、`createOrderFixture(opts?)` | 同上，返回符合 Prisma 类型的对象                                |
| **集成测试 Seed**        | 与 `prisma/seed.ts` 可复用的测试用 seed 逻辑                                  | `test/fixtures/seed-test-data.ts`                               |
| **E2E 专用**             | 强依赖真实 DB 的 fixture，在 `beforeAll` 中调用 Prisma 插入                   | 可引用上述 factory，再 `prisma.xxx.create({ data: factory() })` |

### 5.5 实施优先级

| 优先级 | 内容                                                                                    | 理由                  | 状态      |
| ------ | --------------------------------------------------------------------------------------- | --------------------- | --------- |
| P0     | 提取 `createRedisMock`、`createClsMock` 到 test-utils，统一 Backend mock 入口           | 高频依赖，重复多      | ✅ 已实现 |
| P1     | 定义 Backend fixture 目录与 `createTenantFixture`、`createMemberFixture` 等基础 factory | 集成/E2E 数据准备统一 | ✅ 已实现 |
| P2     | Admin-Web `src/test/mocks/` 与 setup.ts 中全局 mock `$message`、`$t`                    | 组件测试前置条件      | 待实施    |
| P3     | 编写 testing.mdc 中的 Mock/Fixture 规范章节                                             | 约束后续用例风格      | ✅ 已实现 |

**已实现文件：**

- `apps/backend/src/test-utils/mocks/redis-mock.ts`、`cls-mock.ts`、`index.ts`
- `apps/backend/test/fixtures/tenant.ts`、`member.ts`、`index.ts`
- `.cursor/rules/testing.mdc`

---

## 5.6 PR 门禁与失败处理（原分散）

### 现状

- **CI**：`.github/workflows/ci.yml` 依次执行 lint → typecheck → test → build，失败即阻断。
- **约定分散**：门禁项、参与范围、失败处理规则未集中文档化。
- **miniapp-client**：无 test 脚本，不参与 `pnpm test`；若有测试需求，缺少统一约定。

### 统一约定（已写入 testing.mdc §6、§7、§8）

| 项目         | 内容                                                            |
| ------------ | --------------------------------------------------------------- |
| PR 门禁      | Lint、TypeCheck、Test、Build 四步，任意失败即不可合并           |
| 参与范围     | 有对应脚本的包参与；miniapp-client 无 test 则 test 步骤跳过     |
| 失败处理     | 本地复现 → 修复 → 重推；禁止合并失败 PR；临时豁免需说明并获同意 |
| Miniapp 测试 | 若有需求：Vitest、`*.spec.ts`、uni mock 约定，见 testing.mdc §8 |

---

## 六、整改实施步骤

### 6.1 阶段一：规范制定（低风险）

1. **新建 `testing.mdc` 规则**  
   约定：命名（`.spec` 统一）、目录（单元与源同目录、集成在 test/integration）、coverage 收集范围与阈值、Mock 与 Fixture 规范。

2. **更新 backend.mdc §9、admin-web.mdc §9**  
   引用 `testing.mdc`，避免重复描述，保持与统一规范一致。
3. **在 testing.mdc 中增加 Mock/Fixture 规范**（见 §5.3、§5.4）。

### 6.2 阶段二：Backend 配置与命名（中风险）

1. **调整 Backend jest `collectCoverageFrom`**：

   ```js
   collectCoverageFrom: [
     'src/**/*.ts',
     '!src/**/*.spec.ts',
     '!src/**/*.module.ts',
     '!src/main.ts',
     '!**/node_modules/**',
   ],
   coverageDirectory: 'coverage',
   coverageThreshold: {
     global: { statements: 60, branches: 50, functions: 60, lines: 60 },
   },
   ```

2. **统一 E2E 命名**：将 `e2e-marketing-flow.test.ts` 重命名为 `e2e-marketing-flow.e2e-spec.ts` 并入 jest-e2e，或迁至 `scripts/` 并改名为 `run-e2e-marketing-flow.ts`，通过单独脚本执行。

3. **Admin-Web**：明确推荐仅用 `*.spec.ts`，逐步替换 `*.test.ts`（若有）。

### 6.3 阶段三：目录与文件迁移（高风险，分步）

1. **迁移 `test/unit/` 到源旁**
   - `test/unit/points-account.service.spec.ts` → `src/module/marketing/points/account/account.service.spec.ts`
   - 其他同理，迁移后删除 `test/unit/`。

2. **迁移 `src/**/\*.integration.spec.ts`到`test/integration/`\*\*
   - `coupon.integration.spec.ts` → `test/integration/coupon.integration.spec.ts`
   - `finance.integration.spec.ts` → `test/integration/finance.integration.spec.ts`
   - 修改 jest-integration 的 `testMatch` 为 `**/test/integration/**/*.integration.spec.ts`。
   - 主 jest 的 `testRegex` 排除 `*.integration.spec.ts`，避免重复执行。

### 6.4 阶段四：CI 与 Turbo 接入

1. **turbo.json**：确认 `test` 任务正确执行各应用测试。
2. **CI**：在 `test:cov` 通过后检查 coverage 是否达标，未达标则失败。

### 6.5 阶段五：Mock 与 Fixture（可选，分步）

1. **Backend**：提取 `createRedisMock`、`createClsMock` 到 `src/test-utils/mocks/`。
2. **Backend**：新建 `test/fixtures/`，实现 `createTenantFixture`、`createMemberFixture` 等。
3. **Admin-Web**：在 `src/test/mocks/` 与 setup 中补充 `$message`、`$t` 等全局 mock。

---

## 七、风险与回退

| 操作                        | 风险                     | 回退                    |
| --------------------------- | ------------------------ | ----------------------- |
| 修改 collectCoverageFrom    | 覆盖率可能短期下降       | revert 配置             |
| 迁移 test/unit/             | 路径与 import 可能需调整 | git revert + 恢复旧路径 |
| 迁移 \*.integration.spec.ts | 需改 jest 配置、路径     | 同上                    |
| 重命名 e2e-marketing-flow   | 相关脚本、文档需同步     | 全局替换回旧名          |

**建议**：阶段一、二可先行；阶段三拆成小 PR，每次只迁移一类文件，便于 review 和回退。
