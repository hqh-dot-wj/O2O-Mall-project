# 门店商品管理模块前后端对齐报告

## 一、模块结构对比

| 后端 (`apps/backend/src/module/store/product`) | 前端 (`apps/admin-web/src/views/store`) | 对齐状态 |
|-----------------------------------------------|------------------------------------------|----------|
| market/list（选品中心列表）                   | product_market                            | ✓ 已对齐 |
| market/detail/:productId（选品中心详情）      | product_market 内嵌                       | ✓ 已对齐 |
| product/import（导入商品）                   | product_market 内嵌                       | ✓ 已对齐 |
| product/import/batch（批量导入）             | product_market 内嵌                       | ✓ 已对齐 |
| product/list（店铺商品列表）                  | product/list                              | ✓ 已对齐 |
| product/update-price（更新价格）             | product/list 内嵌                          | ✓ 已对齐 |
| product/update-price/batch（批量调价）       | product/list 内嵌                          | ✓ 已对齐 |
| product/update-base（更新基础信息）          | product/list 内嵌                          | ✓ 已对齐 |
| product/remove（移除店铺商品）                | product/list 内嵌                          | ✓ 已对齐 |
| product/stock-alert/config（库存预警阈值）    | product/list 内嵌                          | ✓ 已对齐 |

---

## 二、类型来源规范

| 类型文件 | 来源 | 说明 |
|----------|------|------|
| `store.d.ts` | `@libs/common-types` ListStoreProductParams、ProductImportParams、ProductPriceUpdateParams、MarketSearchParams 等 | 请求参数与响应类型 |

---

## 三、接口与需求对照

需求文档 `product-requirements.md` §5.1 接口清单：

| 需求接口       | 方法 | 路径                                | 后端实现 | 前端实现 |
|----------------|------|-------------------------------------|----------|----------|
| 选品中心列表   | POST | /store/market/list                 | ✓        | ✓        |
| 选品中心详情   | GET  | /store/market/detail/:productId    | ✓        | ✓        |
| 导入商品       | POST | /store/product/import              | ✓        | ✓        |
| 批量导入商品   | POST | /store/product/import/batch        | ✓        | ✓        |
| 店铺商品列表   | POST | /store/product/list                | ✓        | ✓        |
| 更新商品价格   | POST | /store/product/update-price       | ✓        | ✓        |
| 批量调价       | POST | /store/product/update-price/batch | ✓        | ✓        |
| 更新基础信息   | POST | /store/product/update-base        | ✓        | ✓        |
| 移除店铺商品   | POST | /store/product/remove             | ✓        | ✓        |
| 获取库存预警阈值 | GET  | /store/product/stock-alert/config | ✓        | ✓        |
| 设置库存预警阈值 | POST | /store/product/stock-alert/config | ✓        | ✓        |

---

## 四、需求文档中待办（后端）

| 编号 | 任务                                      | 状态      |
|------|-------------------------------------------|-----------|
| D-2  | importProduct 改用 @Transactional()       | ⏳ 待处理 |
| D-3  | findAll 的 storeId 参数增加 HQ 角色校验   | ⏳ 待处理 |
| D-5  | 重新导入时 upsert 更新已有 SKU            | ⏳ 待处理 |
| D-7  | updateProductPrice 乐观锁竞态窗口         | ⏳ 待处理 |
| D-9  | Service 改用 Repository 层                | ⏳ 待处理 |

---

## 五、前端测试覆盖（按 testing.mdc §0.3）

| 测试类型 | 文件                 | 覆盖内容                                                                 |
|----------|----------------------|--------------------------------------------------------------------------|
| API 单测 | `store/product.spec.ts` | list、import、update-price、update-base、market/list、market/detail、batchImport、batchUpdatePrice、remove、stock-alert get/set |
| E2E 冒烟 | `product-routes.spec.ts` | /store/product/list、/store/product/market 登录后可访问                  |

**API 单测**：`pnpm --filter @apps/admin-web test -- src/service/api/store/product.spec.ts --run`

**E2E**（必须运行，不可跳过）：
1. 先启动 `pnpm dev` 与 backend
2. `pnpm --filter @apps/admin-web test:e2e e2e/login-to-home.spec.ts e2e/product-routes.spec.ts`

---

## 六、后续操作（类型滞后时）

若修改了后端 DTO/VO，需重新生成类型：

```powershell
pnpm build:backend
pnpm generate-types
```
