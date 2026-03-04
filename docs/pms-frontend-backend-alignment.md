# PMS 模块前后端对齐报告

## 一、模块结构对比

| 后端 (`apps/backend/src/module/pms`) | 前端 (`apps/admin-web/src/views/pms`) | 对齐状态 |
|--------------------------------------|----------------------------------------|----------|
| product (商品)                       | global-product + global-product-create | ✓ 已对齐 |
| category (分类)                      | category                               | ✓ 已对齐 |
| brand (品牌)                         | brand                                  | ✓ 已对齐 |
| attribute (属性模板)                 | attribute                              | ✓ 已对齐 |

---

## 二、类型来源规范

### 2.1 类型必须来自 common-types

| 类型文件 | 来源 | 说明 |
|----------|------|------|
| `pms.d.ts` | `@libs/common-types` components + `RequestParams` | Product、ProductSearchParams 等 |
| `pms-category.d.ts` | `@libs/common-types` components + `RequestParams` | Category、CategorySearchParams 等 |
| `pms-brand.d.ts` | `@libs/common-types` components + `RequestParams` | Brand、BrandSearchParams 等 |
| `pms-attribute.d.ts` | `@libs/common-types` 的 `pms-attribute` 模块 | OpenAPI 未完整定义 attribute，手写在 libs 内 |

### 2.2 禁止手写重复类型

- **禁止**在 `typings/api/pms*.d.ts` 中手写与后端 VO/DTO 重复的字段
- **必须**使用 `RequestParams<'/api/admin/pms/xxx/list', 'get'>` 作为 SearchParams 基准
- **必须**执行 `pnpm build:backend; pnpm generate-types` 后类型才包含最新 DTO 变更

---

## 三、已实施修复（2026-03）

### 3.1 商品

- ListProductDto 增加 `publishStatus`
- ProductSearchParams 使用 RequestParams + publishStatus 兜底
- 批量删除改为前端循环单删

### 3.2 分类

- CreateCategoryDto 增加 `bindType`
- CategoryVo 增加 `level`、`bindType`、`attrTemplate`
- findAll 增加 `include: { attrTemplate: true }`
- CategorySearchParams 使用 RequestParams

### 3.3 品牌 / 属性

- BrandSearchParams 使用 RequestParams
- 属性继续使用 libs 内 `pms-attribute.d.ts`（OpenAPI 未完整定义）

---

## 四、后续操作（类型滞后时）

若修改了后端 DTO/VO，需重新生成类型：

```powershell
pnpm build:backend
pnpm generate-types
```

注意：若 `build:backend` 报 `ENOTEMPTY`（Windows 下 dist 被占用），可先停止 dev:backend 再构建。

---

## 五、前端测试覆盖（按 testing.mdc §0.3）

| 测试类型 | 文件 | 覆盖内容 |
|----------|------|----------|
| API 单测 | `product.spec.ts` | list(含全参数)、detail、create、update、status、delete、batchDelete |
| API 单测 | `category.spec.ts` | tree、list、detail、create、update、delete |
| API 单测 | `brand.spec.ts` | list(含 params)、detail、create、update、delete |
| API 单测 | `attribute.spec.ts` | list(含 params)、detail、create、update、delete、getByCategory |
| E2E 冒烟 | `pms-routes.spec.ts` | /pms/attribute、brand、category、global-product、global-product-create 登录后可访问 |

**API 单测**：`pnpm --filter @apps/admin-web test -- src/service/api/pms --run`

**E2E**（必须运行，不可跳过）：
1. 先启动 `pnpm dev` 与 backend
2. `pnpm --filter @apps/admin-web test:e2e e2e/login-to-home.spec.ts e2e/pms-routes.spec.ts`
