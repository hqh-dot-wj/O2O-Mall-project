# 疑似无用/失效文档清单

> 基于引用关系与文件存在性扫描生成。**已执行删除**（2026-02-10）：下列“孤儿/冗余”文档已删除，失效链接已修复或移除。

---

## 一、失效链接（目标文件不存在）

以下文档或索引中的链接指向**不存在的文件**，建议修复路径或移除链接。

### 1. 根文档索引 `docs/DOCUMENTATION_INDEX.md`

| 链接文本 | 当前路径 | 说明 |
|----------|----------|------|
| 快速开始指南 | `QUICK_START.md`（相对 docs/） | **docs 根目录无此文件**，实际为 `guide/quick-start.md` 或可指向 `../apps/backend/docs/QUICK_START.md` |
| 日志监控实施 | `../apps/backend/docs/LOGGING_MONITORING.md` | **文件不存在**（全仓库无 LOGGING_MONITORING.md） |
| 实施总结（日志） | `../apps/backend/IMPLEMENTATION_SUMMARY.md` | **backend 根目录无此文件**（仅有 src/module/marketing 下的 IMPLEMENTATION_SUMMARY） |
| GitHub Actions | `GITHUB_ACTIONS.md` | **不存在** |
| GitHub Secrets | `GITHUB_SECRETS_SETUP.md` | **不存在** |
| 本地部署 | `LOCAL_DEPLOYMENT.md` | **不存在** |

### 2. Backend 文档内部

| 所在文档 | 链接目标 | 说明 |
|----------|----------|------|
| `E2E_TEST_GUIDE.md` | `./MARKETING_CONFIG_GUIDE.md` | **不存在** |
| `PLATFORM_COMMISSION_GUIDE.md` | `./COMMISSION_CONFIG.md` | **不存在** |
| `PLATFORM_COMMISSION_GUIDE.md` | `./MULTI_TENANT_ARCHITECTURE.md` | **不存在** |
| `COURSE_PRODUCTS_SEED_GUIDE.md` | `./PRODUCT_MANAGEMENT.md` | **不存在** |
| `QUICK_START_MARKETING.md` | `../stock/stock.md` | **apps/backend/stock 不存在** |
| `marketing-templates-update.md` | `../stock/stock.md` | 同上 |
| `COMPLETE_BUSINESS_FLOW.md` | `./finance/finance.md`、`./finance/commission/commission.md` 等 | 相对路径指向 **docs/finance/**，实际在 **src/module/finance/**，应改为 `../src/module/finance/finance.md` 等 |
| `BUSINESS_FLOW_SUMMARY.md` | `./apps/backend/src/module/finance/finance.md` | 路径写死且从 docs 出发错误，应改为相对路径 |

### 3. 归档后未更新的链接（目标已移至 archive/）

| 所在文档 | 链接目标 | 建议 |
|----------|----------|------|
| `OPTIMIZATION_README.md` | `./OPTIMIZATION_SUMMARY.md`、`./OPTIMIZATION_CHECKLIST.md`、`./P0_OPTIMIZATION_FINAL_REPORT.md`、`./P1_OPTIMIZATION_COMPLETE.md` | 改为 `./archive/xxx.md` |
| `OPTIMIZATION_QUICK_START.md` | `./OPTIMIZATION_CHECKLIST.md` | 改为 `./archive/OPTIMIZATION_CHECKLIST.md` |
| `TEST_IMPLEMENTATION_SUMMARY.md` | `./P0_IMPLEMENTATION_SUMMARY.md`、`./P1_IMPLEMENTATION_SUMMARY.md` | 改为 `./archive/xxx.md` |

---

## 二、未被主索引引用的文档（孤儿文档）

以下文档**未出现在** `docs/DOCUMENTATION_INDEX.md` 或 `apps/backend/docs/README.md` 的主分类中，也未在 VitePress 侧栏中配置，可能为历史遗留或专项文档。是否“无用”需人工判断。

### 1. 根目录 `docs/` 下

| 文件 | 说明 |
|------|------|
| `cart.md` | 购物车相关，未在索引中 |
| `cart_fx.md` | 同上 |
| `money.md` | 未在索引中 |
| `tantant.md` | 租户相关（与 HQvsTantant 可能重复） |
| `HQvsTantant.md` | 仅被 HQvsTantant_Refined 引用 |
| `HQvsTantant_Refined.md` | 同上，成对出现 |
| `Marketing as a Product.md` | 未在索引中 |
| `TEST_ACCOUNTS.md` | 仅被 fixes/demo-role-permissions-setup 引用，可保留 |
| `ROADMAP.md` | 未在索引中 |
| `CHANGELOG.md` | 索引有提及，但链接为 `../CHANGELOG.md`（根 README 同级），若仓库根无 README/CHANGELOG 则可能失效 |
| `architecture/enum-management.md` | 未在索引中 |
| `marketing/ACTIVITY_CONFLICT_RULES.md` | 未在索引中 |
| `marketing/COMPLETE_WORKFLOW.md` | 未在索引中 |
| `fixes/demo-account-missing-fix.md`、`fixes/demo-fix-summary.md`、`fixes/demo-password-fix.md`、`fixes/demo-role-permissions-setup.md` | 修复类说明，未在索引中 |

### 2. Backend `apps/backend/docs/` 下（未在 README 主分类中列出）

| 文件 | 说明 |
|------|------|
| `API_REFERENCE.md` | 有用，建议加入 README「API / 参考」类 |
| `BUSINESS_FLOW_SUMMARY.md` | 与 COMPLETE_BUSINESS_FLOW 可能重复，可考虑合并或二选一 |
| `code_PR.md` | 规范类，可归入「开发规范」 |
| `COUPON_AND_POINTS_DEPLOYMENT.md` | 可与 COUPON_AND_POINTS_QUICK_START 一起归类 |
| `COUPON_AND_POINTS_FINAL_SUMMARY.md` | 总结类，可考虑移入 archive |
| `COURSE_PRODUCTS_IMPLEMENTATION_SUMMARY.md` | 与 SEED_GUIDE 可能重叠 |
| `DEGRADATION_STRATEGY.md` | 未在 README |
| `DEPLOYMENT_GUIDE.md` | 与 DEPLOYMENT_SEED/QUICK_START 关系需理清 |
| `LOGGING_BEST_PRACTICES.md` | 未在 README |
| `Mermaid Sequence Diagram.md` | 未在 README |
| `marketing-templates-update.md` | 被 QUICK_START_MARKETING 引用，但含失效链接 |
| `PERFORMANCE_OPTIMIZATION.md` | 与 PERFORMANCE_OPTIMIZATION_SUMMARY 可能重复 |
| `postman_wechat_test.md` | 专项测试说明，未在 README |
| `TESTING_GUIDE.md` | 未在 README（与 E2E_TEST_GUIDE、TEST_IMPLEMENTATION_SUMMARY 关系需理清） |
| `TENANT_ISOLATION_VERIFICATION.md` | 未在 README |

### 3. Backend 根目录（非 docs/）的 .md

| 文件 | 说明 |
|------|------|
| `Menu_Structure.md` | 菜单结构，未在 docs 索引中 |
| `SAAS多租户架构分析与改造建议.md` | 分析类，未在 docs 索引中 |

---

## 三、建议操作汇总

| 类型 | 建议 |
|------|------|
| **失效链接** | 修正 DOCUMENTATION_INDEX 与 backend 文档中的路径；将 OPTIMIZATION_README、OPTIMIZATION_QUICK_START、TEST_IMPLEMENTATION_SUMMARY 中指向已归档文件的链接改为 `./archive/xxx.md`；COMPLETE_BUSINESS_FLOW 的 finance 链接改为 `../src/module/finance/...` |
| **不存在的目标** | 若不再需要「日志监控」「GitHub Actions」等入口，可从 DOCUMENTATION_INDEX 移除对应项；若需要则补写文档或改为现有文档链接 |
| **孤儿文档** | 先不删：可把明确仍要保留的（如 API_REFERENCE、TEST_ACCOUNTS）加入索引；对明显重复或纯历史的（如 cart/money/tantant 等）确认后归档或删除 |
| **Backend 总结类** | COUPON_AND_POINTS_FINAL_SUMMARY、COURSE_PRODUCTS_IMPLEMENTATION_SUMMARY 等若仅为一次性报告，可移入 `docs/archive/` 并在 README 中标注 |

---

## 四、已执行删除（2026-02-10）

- **根 docs/**：cart.md, cart_fx.md, money.md, tantant.md, HQvsTantant.md, HQvsTantant_Refined.md, Marketing as a Product.md, ROADMAP.md, architecture/enum-management.md, marketing/ACTIVITY_CONFLICT_RULES.md, marketing/COMPLETE_WORKFLOW.md, fixes/*.md（4 个）, TEST_ACCOUNTS.md
- **Backend 根目录**：Menu_Structure.md, SAAS多租户架构分析与改造建议.md
- **Backend docs/**：postman_wechat_test.md, Mermaid Sequence Diagram.md, COUPON_AND_POINTS_FINAL_SUMMARY.md, COURSE_PRODUCTS_IMPLEMENTATION_SUMMARY.md
- **链接**：DOCUMENTATION_INDEX 中 QUICK_START→guide/quick-start、移除不存在的日志/部署链接；OPTIMIZATION_README、OPTIMIZATION_QUICK_START、TEST_IMPLEMENTATION_SUMMARY 中指向 archive 的链接已改为 ./archive/xxx.md

## 五、使用说明

- 本清单保留供后续排查；若再发现无用文档可继续清理。
- 修复链接后建议用 VitePress build 或本地打开关键页检查死链。
