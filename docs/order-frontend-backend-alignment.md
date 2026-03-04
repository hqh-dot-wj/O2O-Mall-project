# 门店订单管理模块前后端对齐报告

## 一、模块结构对比

| 后端 (`apps/backend/src/module/store/order`) | 前端 (`apps/admin-web/src/views/store/order`) | 对齐状态 |
|---------------------------------------------|------------------------------------------------|----------|
| list（订单列表）                             | list                                           | ✓ 已对齐 |
| detail/:id（订单详情）                       | detail                                         | ✓ 已对齐 |
| dispatch/list（待派单列表）                  | dispatch                                       | ✓ 已对齐（T-0 已完成） |
| reassign（改派技师）                         | detail、dispatch 内嵌                          | ✓ 已对齐 |
| verify（强制核销）                           | list、detail 内嵌                              | ✓ 已对齐 |
| refund（退款）                               | detail 内嵌                                    | ✓ 已对齐 |
| refund/partial（部分退款）                   | detail 内嵌                                    | ✓ 已对齐 |
| batch/verify（批量核销）                     | list 内嵌                                      | ✓ 已对齐 |
| batch/refund（批量退款）                     | list 内嵌                                      | ✓ 已对齐 |
| export（导出订单）                           | list 内嵌                                      | ✓ 已对齐 |

---

## 二、类型来源规范

| 类型文件 | 来源 | 说明 |
|----------|------|------|
| `order.api.d.ts` | `@libs/common-types` StoreOrderSearchParams、StoreOrderListItemVo、StoreOrderDetailVo | 请求参数与响应类型 |

---

## 三、接口与需求对照

需求文档 `order-requirements.md` §4.1 接口清单：

| 需求接口 | 方法 | 路径 | 后端实现 | 前端实现 |
|----------|------|------|----------|----------|
| 订单列表 | GET | /store/order/list | ✓ | ✓ |
| 订单详情 | GET | /store/order/detail/:id | ✓ | ✓ |
| 待派单列表 | GET | /store/order/dispatch/list | ✓ | ✓（dispatch 页） |
| 改派技师 | POST | /store/order/reassign | ✓ | ✓ |
| 强制核销 | POST | /store/order/verify | ✓ | ✓ |
| 退款 | POST | /store/order/refund | ✓ | ✓ |
| 部分退款 | POST | /store/order/refund/partial | ✓ | ✓ |
| 导出订单 | GET | /store/order/export | ✓ | ✓ |
| 批量核销 | POST | /store/order/batch/verify | ✓ | ✓ |
| 批量退款 | POST | /store/order/batch/refund | ✓ | ✓ |

---

## 四、T-0 待办完成情况

| 编号 | 任务 | 状态 |
|------|------|------|
| T-0 | 补充待派单页面的前端对接 | ✅ 已完成 |

- 新建 `views/store/order/dispatch/index.vue`
- 调用 `fetchGetDispatchList` 展示待派单列表（SERVICE、PAID、workerId=null）
- 支持改派/派单操作（输入技师 ID，调用 `fetchReassignWorker`）
- 路由 `/store/order/dispatch` 已存在，已补充 i18n

---

## 五、前端测试覆盖（按 testing.mdc §0.3）

| 测试类型 | 文件 | 覆盖内容 |
|----------|------|----------|
| API 单测 | `store/order.spec.ts` | list、detail、dispatch/list、reassign、verify、refund、partialRefund、export、batchVerify、batchRefund |
| E2E 冒烟 | `order-routes.spec.ts` | /store/order/list、dispatch、detail 登录后可访问 |

**API 单测**：`pnpm --filter @apps/admin-web test -- src/service/api/store/order.spec.ts --run`

**E2E**（必须运行，不可跳过）：
1. 先启动 `pnpm dev` 与 backend
2. `pnpm --filter @apps/admin-web test:e2e e2e/login-to-home.spec.ts e2e/order-routes.spec.ts`

---

## 六、后续操作（类型滞后时）

若修改了后端 DTO/VO，需重新生成类型：

```powershell
pnpm build:backend
pnpm generate-types
```
