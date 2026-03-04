# 优惠券系统前后端对齐报告

## 一、模块结构对比

| 后端 (`apps/backend/src/module/marketing/coupon`) | 前端 (`apps/admin-web`) | 对齐状态 |
|---------------------------------------------------|-------------------------|----------|
| template（模板 CRUD + 状态）                      | marketing/coupon/template | ✓ 已对齐 |
| distribution/manual（手动发放）                   | store/distribution/coupon-distribution | ✓ 已对齐 |
| management（用户券、使用记录、统计、导出）        | store/distribution/coupon-usage、marketing/statistics/coupon | ✓ 已对齐 |
| 内部服务（claim、lock、use、refund 等）          | 无 HTTP 端点，由 C 端/集成模块调用 | - |

---

## 二、类型来源规范

| 类型 | 来源 | 说明 |
|------|------|------|
| CouponTemplate、CouponTemplateList、CouponTemplateCreate、CouponTemplateUpdate | `@libs/common-types` / OpenAPI | 模板相关 |
| UserCoupon、CouponUsageRecord、CouponStatistics | `@libs/common-types` / OpenAPI | 管理、统计相关 |

---

## 三、接口与需求对照

需求文档 `coupon-requirements.md` §5.1 接口清单：

### 3.1 优惠券模板（5 个端点）

| 需求接口 | 方法 | 路径 | 后端 | 前端 |
|----------|------|------|------|------|
| 模板列表 | GET | /admin/marketing/coupon/templates | ✓ | ✓ |
| 模板详情 | GET | /admin/marketing/coupon/templates/:id | ✓ | ✓（编辑用列表行数据，可单独调详情） |
| 创建模板 | POST | /admin/marketing/coupon/templates | ✓ | ✓ |
| 更新模板 | PUT | /admin/marketing/coupon/templates/:id | ✓ | ✓ |
| 更新状态 | PATCH | /admin/marketing/coupon/templates/:id/status | ✓ | ✓ |
| 停用模板 | DELETE | /admin/marketing/coupon/templates/:id | ✓ | ✓ |

### 3.2 优惠券发放

| 需求接口 | 方法 | 路径 | 后端 | 前端 |
|----------|------|------|------|------|
| 手动发放 | POST | /admin/marketing/coupon/distribute/manual | ✓ | ✓ |

### 3.3 优惠券管理

| 需求接口 | 方法 | 路径 | 后端 | 前端 |
|----------|------|------|------|------|
| 用户券列表 | GET | /admin/marketing/coupon/user-coupons | ✓ | 暂无独立页面（发放页可选用） |
| 使用记录 | GET | /admin/marketing/coupon/usage-records | ✓ | ✓ |
| 统计数据 | GET | /admin/marketing/coupon/statistics | ✓ | ✓ |
| 导出记录 | GET | /admin/marketing/coupon/export | ✓ | ✓ |

---

## 四、前端页面与 API 对应

| 页面 | 路由 | 使用 API |
|------|------|----------|
| 优惠券模板 | /marketing/coupon/template | marketing-coupon：list、create、update、delete、status |
| 优惠券统计 | /marketing/statistics/coupon | marketing-statistics：fetchGetCouponStatistics（同 /admin/marketing/coupon/statistics） |
| 优惠券发放 | /store/distribution/coupon-distribution | marketing-coupon：distributeManual、getTemplateList；member：getMemberList |
| 使用记录 | /store/distribution/coupon-usage | marketing-coupon：getUsageRecords、export（getDownload） |

---

## 五、需求文档中待办（后端）

来自 `coupon-requirements.md` §6、§8、§9：

| 编号 | 任务 | 状态 |
|------|------|------|
| D-1 | Controller 添加 @ApiBearerAuth | ❌ 未实现 |
| D-2 | Controller 添加 @RequirePermission | ❌ 未实现 |
| D-3 | 写操作添加 @Operlog | ❌ 未实现 |
| D-4 | Service 使用 CouponErrorCode 替代硬编码 | ❌ 未实现 |
| D-5 | 定时任务添加分布式锁 | ❌ 未实现 |
| D-7 | 7 日趋势 N+1 改为单次聚合 | ❌ 未实现 |
| D-8 | 导出添加数量限制/异步导出 | ❌ 未实现 |
| X-2 | C 端 Controller 规范化 + available 端点实现 | ❌ 未实现 |

---

## 六、前端测试覆盖（按 testing.mdc §0.3）

| 测试类型 | 文件 | 覆盖内容 |
|----------|------|----------|
| API 单测 | `marketing-coupon.spec.ts` | templates CRUD、status、delete、distribute/manual、user-coupons、usage-records、statistics、export |
| E2E 冒烟 | `coupon-routes.spec.ts` | /marketing/coupon/template、/marketing/statistics/coupon、/store/distribution/coupon-distribution、/store/distribution/coupon-usage 登录后可访问 |

**API 单测**：`pnpm --filter @apps/admin-web test -- src/service/api/marketing-coupon.spec.ts --run`

**E2E**（必须运行，不可跳过）：
1. 先启动 `pnpm dev` 与 backend
2. `pnpm --filter @apps/admin-web test:e2e e2e/login-to-home.spec.ts e2e/coupon-routes.spec.ts`

---

## 七、后续操作（类型滞后时）

若修改了后端 DTO/VO，需重新生成类型：

```powershell
pnpm build:backend
pnpm generate-types
```
