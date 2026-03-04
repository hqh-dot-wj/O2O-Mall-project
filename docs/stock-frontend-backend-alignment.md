# 门店库存管理模块前后端对齐报告

## 一、模块结构对比

| 后端 (`apps/backend/src/module/store/stock`) | 前端 (`apps/admin-web/src/views/store/stock`) | 对齐状态 |
|--------------------------------------------|-----------------------------------------------|----------|
| list（库存列表）                           | index                                          | ✓ 已对齐 |
| update（更新库存）                         | index 内嵌（补货/减货）                        | ✓ 已对齐 |
| batch/update（批量调整）                   | BatchStockModal                                | ✓ 已对齐 |
| export（导出）                             | index 内嵌（getDownload）                      | ✓ 已对齐 |

---

## 二、类型来源规范

| 类型文件         | 来源             | 说明                                           |
|------------------|------------------|------------------------------------------------|
| `store-stock.d.ts` | `@libs/common-types` | StockSkuVo、StockSearchParams、StockUpdateParams、BatchUpdateStockParams 等 |

---

## 三、接口与需求对照

需求文档 `stock-requirements.md` §5.1 接口清单（已演进）：

| 需求接口   | 方法 | 路径                  | 后端实现 | 前端实现 |
|------------|------|-----------------------|----------|----------|
| 库存列表   | POST | /store/stock/list     | ✓        | ✓        |
| 更新库存   | POST | /store/stock/update   | ✓        | ✓        |
| 批量调整   | POST | /store/stock/batch/update | ✓   | ✓        |
| 导出库存   | GET  | /store/stock/export   | ✓        | ✓（getDownload） |

**说明**：后端已补充 `@RequirePermission`、`@Operlog`、批量调整、导出等功能，超出需求文档描述。

---

## 四、需求文档中待办（后端）

| 编号 | 任务                          | 状态      |
|------|-------------------------------|-----------|
| D-1  | 添加 @RequirePermission       | ✅ 已实现 |
| D-2  | 添加 @ApiBearerAuth           | ✅ 已实现 |
| D-3  | 库存更新添加 @Operlog         | ✅ 已实现 |
| D-4  | UpdateStockDto 增加 reason    | 需确认后端 DTO |
| D-5  | updateStock 竞态窗口          | ⏳ 待处理 |
| D-7  | Service 改用 Repository       | ⏳ 待处理 |
| D-8  | 单元测试与实际实现匹配        | ⏳ 待处理 |
| D-9  | stockChange 非零校验          | ⏳ 待处理 |

---

## 五、前端测试覆盖（按 testing.mdc §0.3）

| 测试类型 | 文件               | 覆盖内容                                   |
|----------|--------------------|--------------------------------------------|
| API 单测 | `store/stock.spec.ts` | list、update（含 reason）、batchUpdate    |
| E2E 冒烟 | `stock-routes.spec.ts` | /store/stock 登录后可访问                 |

**API 单测**：`pnpm --filter @apps/admin-web test -- src/service/api/store/stock.spec.ts --run`

**E2E**（必须运行，不可跳过）：
1. 先启动 `pnpm dev` 与 backend
2. `pnpm --filter @apps/admin-web test:e2e e2e/login-to-home.spec.ts e2e/stock-routes.spec.ts`

---

## 六、后续操作（类型滞后时）

若修改了后端 DTO/VO，需重新生成类型：

```powershell
pnpm build:backend
pnpm generate-types
```
