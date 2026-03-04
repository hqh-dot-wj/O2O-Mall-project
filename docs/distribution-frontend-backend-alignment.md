# 门店分销模块前后端对齐报告

## 一、模块结构对比

| 后端 (`apps/backend/src/module/store/distribution`) | 前端 (`apps/admin-web/src/views/store/distribution`) | 对齐状态 |
|------------------------------------------------------|-------------------------------------------------------|----------|
| config（租户级分销配置）                             | distribution（分销配置页）、store/finance/distribution-config | ✓ 已对齐 |
| config/logs（变更历史）                              | distribution 内嵌变更历史表格                          | ✓ 已对齐 |
| commission/preview（佣金预估）                       | 暂无独立页面调用                                       | ✓ 接口对齐 |
| product-config（商品级分佣）                         | distribution-product                                 | ✓ 已对齐 |
| dashboard（数据看板）                                | distribution-dashboard                                | ✓ 已对齐 |
| level（等级体系）                                    | distribution-level                                   | ✓ 已对齐 |
| application（申请/审核）                             | distribution-application                             | ✓ 已对齐 |

---

## 二、类型来源规范

### 2.1 类型必须来自 common-types

| 类型文件 | 来源 | 说明 |
|----------|------|------|
| `store.d.ts` | `@libs/common-types` components | DistributionConfig、CommissionPreviewDto/Vo、Level、Application 等 |
| Api.Store.* | `@libs/common-types` 导出 + admin-web typings/api/store.d.ts | 全部引用 OpenAPI 生成的 schema |

### 2.2 已实施修复（2026-03）

- **CommissionPreviewDto/Vo**：由手写 `StoreCommissionPreviewDto`（productId+orderAmount）改为使用 OpenAPI `CommissionPreviewDto`（tenantId、items、shareUserId）与 `CommissionPreviewVo`（tenantName、commissionRate、estimatedAmount 等），与后端保持一致

---

## 三、API 文件与使用情况

| API 文件 | 使用方 | 说明 |
|-----------|--------|------|
| `service/api/distribution.ts` | store/distribution/* 各子页 | 完整接口（config、product-config、dashboard、level、application） |
| `service/api/store/distribution.ts` | store/finance/distribution-config | 仅 config 的 get/update，无 logs、无分页 |

**说明**：`store/finance/distribution-config` 与 `store/distribution/distribution` 功能重叠，均为租户级分销配置编辑。可考虑统一使用 `distribution.ts` 并逐步废弃 `store/distribution.ts`。

---

## 四、接口与需求对照

需求文档 `distribution-requirements.md` 4.2 接口清单：

| 需求接口 | 方法 | 后端实现 | 前端实现 |
|----------|------|----------|----------|
| 获取配置 | GET /config | ✓ | ✓ |
| 更新配置 | POST /config | ✓ | ✓ |
| 变更历史 | GET /config/logs | ✓（支持分页） | ✓ |
| 佣金预估 | GET /commission/preview | POST（需求写 GET，后端为 POST + Body） | ✓ POST |

**说明**：需求文档写 GET，但佣金预估需传 tenantId、items、shareUserId，实际使用 POST + Body 更合理，前后端一致。

---

## 五、需求文档中未实现/待修复项

来自 `distribution-requirements.md` §5、§7、§8：

| 编号 | 说明 | 状态 |
|------|------|------|
| AC-5 | 佣金预估接口返回实际预估金额（非 0） | ❌ 需求未实现（D-1、D-2） |
| AC-6 | 变更日志包含 commissionBaseType 和 maxCommissionRate | ❌ 需求未实现（D-3） |
| T-1 | 佣金预估接口实现商品级金额计算 | 待后端 |
| T-2 | 变更日志补充 commissionBaseType、maxCommissionRate | 待后端 |
| T-3 | 配置更新加 @Transactional() | 待后端 |
| T-4 | 变更日志支持分页 | ✅ 已实现 |
| T-5 | 默认配置调整为更合理值 | 待后端 |

---

## 六、前端测试覆盖（按 testing.mdc §0.3）

| 测试类型 | 文件 | 覆盖内容 |
|----------|------|----------|
| API 单测 | `distribution.spec.ts` | config、config/logs(分页)、commission/preview、product-config/list、dashboard、level/list、application/list、review/config |
| E2E 冒烟 | `distribution-routes.spec.ts` | /store/distribution/distribution、distribution-product、distribution-level、distribution-application、distribution-dashboard 登录后可访问 |

**API 单测**：`pnpm --filter @apps/admin-web test -- src/service/api/distribution.spec.ts --run`

**E2E**（必须运行，不可跳过）：
1. 先启动 `pnpm dev` 与 backend
2. `pnpm --filter @apps/admin-web test:e2e e2e/login-to-home.spec.ts e2e/distribution-routes.spec.ts`

---

## 七、后续操作（类型滞后时）

若修改了后端 DTO/VO，需重新生成类型：

```powershell
pnpm build:backend
pnpm generate-types
```
