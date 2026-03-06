# 门店财务管理模块前后端对齐报告

## 一、模块结构对比

| 后端 (`apps/backend/src/module/store/finance`) | 前端 (`apps/admin-web/src/views/store/finance`)                 | 对齐状态 |
| ---------------------------------------------- | --------------------------------------------------------------- | -------- |
| dashboard（资金看板）                          | dashboard                                                       | ✓ 已对齐 |
| commission/list（佣金明细）                    | commission                                                      | ✓ 已对齐 |
| commission/stats（佣金统计）                   | dashboard 内嵌                                                  | ✓ 已对齐 |
| withdrawal/list（提现列表）                    | withdrawal                                                      | ✓ 已对齐 |
| withdrawal/audit（提现审核）                   | withdrawal 内嵌                                                 | ✓ 已对齐 |
| ledger（统一流水）                             | ledger                                                          | ✓ 已对齐 |
| ledger/stats（流水统计）                       | ledger 内嵌                                                     | ✓ 已对齐 |
| ledger/export（流水导出）                      | ledger 内嵌                                                     | ✓ 已对齐 |
| —                                              | distribution-config（重定向至 store/distribution/distribution） | ✓ 已对齐 |

---

## 二、类型来源规范

### 2.1 类型必须来自 common-types

| 类型文件       | 来源                                                               | 说明                                                                            |
| -------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `finance.d.ts` | `@libs/common-types` operations + components                       | CommissionSearchParams、WithdrawalSearchParams、LedgerSearchParams 来自 OpenAPI |
| Api.Finance.\* | `@libs/common-types` 导出 + admin-web typings/api/finance.api.d.ts | Dashboard、CommissionRecord、LedgerRecord 等响应类型                            |

### 2.2 流水日期范围参数

- **后端期望**：`params: { beginTime: string, endTime: string }`（PageQueryDto.getDateRange）
- **前端现状**：ledger-search 使用 `createTime` 绑定 NDatePicker，需在请求前转换为 `params.beginTime` / `params.endTime`
- **建议**：在 searchParams 提交时，若存在 createTime（日期范围），映射为 `params: { beginTime, endTime }`

---

## 三、接口与需求对照

需求文档 `finance-requirements.md` §4.2 接口清单：

| 需求接口 | 方法 | 路径                            | 后端实现 | 前端实现 |
| -------- | ---- | ------------------------------- | -------- | -------- |
| 资金看板 | GET  | /store/finance/dashboard        | ✓        | ✓        |
| 佣金列表 | GET  | /store/finance/commission/list  | ✓        | ✓        |
| 佣金统计 | GET  | /store/finance/commission/stats | ✓        | ✓        |
| 提现列表 | GET  | /store/finance/withdrawal/list  | ✓        | ✓        |
| 提现审核 | POST | /store/finance/withdrawal/audit | ✓        | ✓        |
| 流水列表 | GET  | /store/finance/ledger           | ✓        | ✓        |
| 流水统计 | GET  | /store/finance/ledger/stats     | ✓        | ✓        |
| 流水导出 | POST | /store/finance/ledger/export    | ✓        | ✓        |

---

## 四、需求文档中未实现/待修复项

来自 `finance-requirements.md` §5、§7、§8：

| 编号  | 说明                                | 状态                               |
| ----- | ----------------------------------- | ---------------------------------- |
| D-1   | 流水查询深分页保护（offset ≤ 5000） | ✅ 已实现（ledger.service 已校验） |
| D-2   | 流水导出数量限制（≤ 10000 条）      | ❌ 待后端                          |
| D-3   | 流水统计排除已取消佣金              | ❌ 待后端                          |
| D-4   | 提现审核租户归属校验                | ❌ 待后端                          |
| D-6   | 佣金查询 phone 参数生效             | ❌ 待后端                          |
| AC-7  | 提现审核校验提现记录归属当前租户    | ❌ 未实现                          |
| AC-8  | 流水 offset > 5000 返回错误         | ✅ 已实现                          |
| AC-9  | 流水导出单次 ≤ 10000 条             | ❌ 未实现                          |
| AC-10 | 流水统计排除已取消佣金              | ❌ 未实现                          |

---

## 五、前端测试覆盖（按 testing.mdc §0.3）

| 测试类型 | 文件                     | 覆盖内容                                                                                                             |
| -------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| API 单测 | `store/finance.spec.ts`  | dashboard、commission/list、commission/stats、withdrawal/list、withdrawal/audit、ledger、ledger/stats、ledger/export |
| E2E 冒烟 | `finance-routes.spec.ts` | /store/finance/dashboard、commission、withdrawal、ledger、distribution-config 登录后可访问                           |

**API 单测**：`pnpm --filter @apps/admin-web test -- src/service/api/store/finance.spec.ts --run`

**E2E**（必须运行，不可跳过）：

1. 先启动 `pnpm dev` 与 backend
2. `pnpm --filter @apps/admin-web test:e2e e2e/login-to-home.spec.ts e2e/finance-routes.spec.ts`

---

## 六、后续操作（类型滞后时）

若修改了后端 DTO/VO，需重新生成类型：

```powershell
pnpm build:backend
pnpm generate-types
```
