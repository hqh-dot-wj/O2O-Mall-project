# Backend 文档重组计划

> 创建日期：2026-02-24  
> 状态：待执行  
> 目标：将所有文档按类型分类，并统一使用小写+连字符命名

---

## 1. 重组原则

1. **分类明确**：按文档类型放入对应目录（guides/、tasks/、plans/、summaries/、references/、best-practices/、testing/）
2. **命名规范**：所有文档使用小写+连字符命名（如 `quick-start.md`）
3. **根目录清理**：根目录只保留 `README.md` 和可选的 `quick-start.md`

---

## 2. 文档迁移清单

### 2.1 指南文档（guides/）

操作步骤、使用说明、配置指南类文档

| 当前文件名                    | 新路径                                | 说明         |
| ----------------------------- | ------------------------------------- | ------------ |
| `QUICK_START.md`              | `guides/quick-start.md`               | 快速开始     |
| `DEPLOYMENT_GUIDE.md`         | `guides/deployment-guide.md`          | 部署指南     |
| `DEPLOYMENT_SEED.md`          | `guides/deployment-seed.md`           | 部署种子数据 |
| `E2E_TEST_GUIDE.md`           | `testing/e2e-test-guide.md`           | E2E测试指南  |
| `TESTING_GUIDE.md`            | `testing/testing-guide.md`            | 测试指南     |
| `DEMO_ACCOUNT_GUIDE.md`       | `guides/demo-account-guide.md`        | 演示账号指南 |
| `CONFIG_README.md`            | `guides/config-readme.md`             | 配置说明     |
| `CONFIG_MIGRATION.md`         | `guides/config-migration.md`          | 配置迁移     |
| `COMMISSION_README.md`        | `guides/commission-readme.md`         | 佣金说明     |
| `COMMISSION_TESTING_GUIDE.md` | `testing/commission-testing-guide.md` | 佣金测试指南 |
| `OPTIMIZATION_README.md`      | `guides/optimization-readme.md`       | 优化说明     |
| `OPTIMIZATION_QUICK_START.md` | `guides/optimization-quick-start.md`  | 优化快速开始 |

### 2.2 任务文档（tasks/）

记录具体任务的执行过程、进度、结果

| 当前文件名                         | 新路径                                   | 说明           |
| ---------------------------------- | ---------------------------------------- | -------------- |
| `ARCHITECTURE_OPTIMIZATION.md`     | `tasks/architecture-optimization.md`     | 架构优化任务   |
| `MULTI_TENANT_MIGRATION.md`        | `tasks/multi-tenant-migration.md`        | 多租户迁移任务 |
| `CONFIG_REFACTORING.md`            | `tasks/config-refactoring.md`            | 配置重构任务   |
| `CAPTCHA_CONFIG_CACHE_FIX.md`      | `tasks/captcha-config-cache-fix.md`      | 验证码缓存修复 |
| `TENANT_ISOLATION_VERIFICATION.md` | `tasks/tenant-isolation-verification.md` | 租户隔离验证   |
| `LOCAL_DEVELOPMENT_LOGGING.md`     | `tasks/local-development-logging.md`     | 本地开发日志   |

### 2.3 计划文档（plans/）

描述未来的工作计划、优化方案、演进路线

| 当前文件名                    | 新路径                                   | 说明           |
| ----------------------------- | ---------------------------------------- | -------------- |
| `PERFORMANCE_OPTIMIZATION.md` | `plans/performance-optimization-plan.md` | 性能优化计划   |
| `DATABASE_OPTIMIZATION.md`    | `plans/database-optimization-plan.md`    | 数据库优化计划 |
| `STRONG_TYPE_OPTIMIZATION.md` | `plans/strong-type-optimization-plan.md` | 强类型优化计划 |

### 2.4 总结文档（summaries/）

对某个阶段或某项工作的总结

| 当前文件名                            | 新路径                                          | 说明         |
| ------------------------------------- | ----------------------------------------------- | ------------ |
| `PERFORMANCE_OPTIMIZATION_SUMMARY.md` | `summaries/performance-optimization-summary.md` | 性能优化总结 |
| `TEST_IMPLEMENTATION_SUMMARY.md`      | `summaries/test-implementation-summary.md`      | 测试实施总结 |
| `DOCUMENTATION_SUMMARY.md`            | `summaries/documentation-summary.md`            | 文档总结     |
| `FINAL_SUMMARY.md`                    | `summaries/final-summary.md`                    | 最终总结     |
| `LESSONS_LEARNED.md`                  | `summaries/lessons-learned.md`                  | 经验教训     |

### 2.5 参考文档（references/）

提供快速查阅的参考信息

| 当前文件名                      | 新路径                                     | 说明         |
| ------------------------------- | ------------------------------------------ | ------------ |
| `API_REFERENCE.md`              | `references/api-reference.md`              | API参考      |
| `COMMISSION_QUICK_REFERENCE.md` | `references/commission-quick-reference.md` | 佣金快速参考 |
| `COMPLETE_BUSINESS_FLOW.md`     | `references/complete-business-flow.md`     | 完整业务流程 |

### 2.6 最佳实践（best-practices/）

提供编码规范、设计模式、经验总结

| 当前文件名                      | 新路径                                         | 说明         |
| ------------------------------- | ---------------------------------------------- | ------------ |
| `LOGGING_BEST_PRACTICES.md`     | `best-practices/logging-best-practices.md`     | 日志最佳实践 |
| `code_PR.md`                    | `best-practices/code-review.md`                | 代码审查规范 |
| `COMMIT_MESSAGE.md`             | `best-practices/commit-message.md`             | 提交信息规范 |
| `ENTERPRISE_CONFIG_SOLUTION.md` | `best-practices/enterprise-config-solution.md` | 企业配置方案 |

### 2.7 进度文档（progress/）

记录项目进度、待办事项

| 当前文件名                  | 新路径                               | 说明     |
| --------------------------- | ------------------------------------ | -------- |
| `DOCUMENTATION_PROGRESS.md` | `progress/documentation-progress.md` | 文档进度 |

### 2.8 保持不变

以下文档已经在正确的位置或需要保持在根目录：

| 文件名            | 位置                                | 说明               |
| ----------------- | ----------------------------------- | ------------------ |
| `README.md`       | `apps/backend/docs/README.md`       | 文档索引（根目录） |
| `requirements/**` | `apps/backend/docs/requirements/**` | 需求文档（已分类） |
| `design/**`       | `apps/backend/docs/design/**`       | 设计文档（已分类） |
| `improvements/**` | `apps/backend/docs/improvements/**` | 改进文档（已分类） |
| `refactoring/**`  | `apps/backend/docs/refactoring/**`  | 重构文档（已分类） |
| `archive/**`      | `apps/backend/docs/archive/**`      | 归档文档（已分类） |

### 2.9 代码目录中的文档迁移（src/module/）

**问题**：`apps/backend/src/module/` 目录下存在大量 `.md` 文档文件（约 50 个），这些文档应该放在 `docs/` 目录而非代码目录中。

**迁移策略**：

| 文档类型          | 当前位置                                         | 新位置                                                | 说明          |
| ----------------- | ------------------------------------------------ | ----------------------------------------------------- | ------------- |
| 模块总览文档      | `src/module/{module}/{module}.md`                | `references/modules/{module}-module-overview.md`      | 模块架构说明  |
| 子模块文档        | `src/module/{module}/{submodule}/{submodule}.md` | `references/modules/{module}-{submodule}-overview.md` | 子模块说明    |
| Client 模块总览   | `src/module/client/README.md`                    | `references/modules/client-module-overview.md`        | C端模块总览   |
| Client 子模块文档 | `src/module/client/{submodule}/{submodule}.md`   | `references/modules/client-{submodule}-overview.md`   | C端子模块说明 |
| 测试相关文档      | `src/module/finance/TEST_*.md`                   | `testing/finance-test-*.md`                           | 测试文档      |
| 特殊文档          | `src/module/store/STORE_COMMISSION_AUDIT.md`     | `references/store-commission-audit.md`                | 特殊参考文档  |

**详细迁移清单**：

```bash
# 创建模块参考文档目录
mkdir -p apps/backend/docs/references/modules

# Finance 模块
mv src/module/finance/finance.md docs/references/modules/finance-module-overview.md
mv src/module/finance/commission/commission.md docs/references/modules/finance-commission-overview.md
mv src/module/finance/settlement/settlement.md docs/references/modules/finance-settlement-overview.md
mv src/module/finance/wallet/wallet.md docs/references/modules/finance-wallet-overview.md
mv src/module/finance/withdrawal/withdrawal.md docs/references/modules/finance-withdrawal-overview.md

# Finance 测试文档
mv src/module/finance/README.TEST.md docs/testing/finance-test-readme.md
mv src/module/finance/TEST_INDEX.md docs/testing/finance-test-index.md
mv src/module/finance/TEST_SCRIPTS.md docs/testing/finance-test-scripts.md
mv src/module/finance/TEST_SUMMARY.md docs/testing/finance-test-summary.md

# Marketing 模块
mv src/module/marketing/marketing.md docs/references/modules/marketing-module-overview.md
mv src/module/marketing/asset/asset.md docs/references/modules/marketing-asset-overview.md
mv src/module/marketing/config/config.md docs/references/modules/marketing-config-overview.md
mv src/module/marketing/instance/instance.md docs/references/modules/marketing-instance-overview.md
mv src/module/marketing/play/play.md docs/references/modules/marketing-play-overview.md
mv src/module/marketing/stock/stock.md docs/references/modules/marketing-stock-overview.md
mv src/module/marketing/template/template.md docs/references/modules/marketing-template-overview.md

# Store 模块
mv src/module/store/store.md docs/references/modules/store-module-overview.md
mv src/module/store/distribution/distribution.md docs/references/modules/store-distribution-overview.md
mv src/module/store/finance/finance.md docs/references/modules/store-finance-overview.md
mv src/module/store/order/order.md docs/references/modules/store-order-overview.md
mv src/module/store/product/product.md docs/references/modules/store-product-overview.md
mv src/module/store/stock/stock.md docs/references/modules/store-stock-overview.md
mv src/module/store/STORE_COMMISSION_AUDIT.md docs/references/store-commission-audit.md

# PMS 模块
mv src/module/pms/pms.md docs/references/modules/pms-module-overview.md
mv src/module/pms/attribute/attribute.md docs/references/modules/pms-attribute-overview.md
mv src/module/pms/brand/brand.md docs/references/modules/pms-brand-overview.md
mv src/module/pms/category/category.md docs/references/modules/pms-category-overview.md

# LBS 模块
mv src/module/lbs/lbs.md docs/references/modules/lbs-module-overview.md
mv src/module/lbs/geo/geo.md docs/references/modules/lbs-geo-overview.md
mv src/module/lbs/region/region.md docs/references/modules/lbs-region-overview.md
mv src/module/lbs/station/station.md docs/references/modules/lbs-station-overview.md

# Risk 模块
mv src/module/risk/risk.md docs/references/modules/risk-module-overview.md

# Client 模块
mv src/module/client/README.md docs/references/modules/client-module-overview.md
mv src/module/client/address/address.md docs/references/modules/client-address-overview.md
mv src/module/client/auth/auth.md docs/references/modules/client-auth-overview.md
mv src/module/client/cart/cart.md docs/references/modules/client-cart-overview.md
mv src/module/client/common/common.md docs/references/modules/client-common-overview.md
mv src/module/client/finance/finance.md docs/references/modules/client-finance-overview.md
mv src/module/client/location/location.md docs/references/modules/client-location-overview.md
mv src/module/client/order/order.md docs/references/modules/client-order-overview.md
mv src/module/client/payment/payment.md docs/references/modules/client-payment-overview.md
mv src/module/client/product/product.md docs/references/modules/client-product-overview.md
mv src/module/client/service/service.md docs/references/modules/client-service-overview.md
mv src/module/client/upgrade/upgrade.md docs/references/modules/client-upgrade-overview.md
mv src/module/client/user/user.md docs/references/modules/client-user-overview.md

# Admin 模块
mv src/module/admin/member/member.md docs/references/modules/admin-member-overview.md
mv src/module/admin/system/tenant-audit/README.md docs/references/modules/admin-tenant-audit-overview.md

# Common 模块
mv src/module/common/axios/axios.md docs/references/modules/common-axios-overview.md
mv src/module/common/bull/bull.md docs/references/modules/common-bull-overview.md
mv src/module/common/redis/redis.md docs/references/modules/common-redis-overview.md
```

**迁移原因**：

1. **代码目录应该只包含代码**：文档文件不应该与源代码混在一起
2. **文档集中管理**：所有文档统一放在 `docs/` 目录，便于查找和维护
3. **构建优化**：减少代码目录中的非代码文件，优化构建和部署流程
4. **规范统一**：与项目文档规范保持一致

**迁移后的好处**：

- 代码目录更清爽，只包含 `.ts` 文件
- 文档统一管理，便于查找
- 符合行业最佳实践
- 便于文档版本控制和更新

---

## 3. 执行步骤

### 3.1 创建新目录

```bash
cd apps/backend/docs

# 创建新的文档分类目录
mkdir -p guides
mkdir -p tasks
mkdir -p plans
mkdir -p summaries
mkdir -p references
mkdir -p best-practices
mkdir -p testing
mkdir -p progress
```

### 3.2 移动并重命名文件

使用脚本批量移动和重命名：

```bash
# 指南文档
mv QUICK_START.md guides/quick-start.md
mv DEPLOYMENT_GUIDE.md guides/deployment-guide.md
mv DEPLOYMENT_SEED.md guides/deployment-seed.md
mv DEMO_ACCOUNT_GUIDE.md guides/demo-account-guide.md
mv CONFIG_README.md guides/config-readme.md
mv CONFIG_MIGRATION.md guides/config-migration.md
mv COMMISSION_README.md guides/commission-readme.md
mv OPTIMIZATION_README.md guides/optimization-readme.md
mv OPTIMIZATION_QUICK_START.md guides/optimization-quick-start.md

# 测试文档
mv E2E_TEST_GUIDE.md testing/e2e-test-guide.md
mv TESTING_GUIDE.md testing/testing-guide.md
mv COMMISSION_TESTING_GUIDE.md testing/commission-testing-guide.md

# 任务文档
mv ARCHITECTURE_OPTIMIZATION.md tasks/architecture-optimization.md
mv MULTI_TENANT_MIGRATION.md tasks/multi-tenant-migration.md
mv CONFIG_REFACTORING.md tasks/config-refactoring.md
mv CAPTCHA_CONFIG_CACHE_FIX.md tasks/captcha-config-cache-fix.md
mv TENANT_ISOLATION_VERIFICATION.md tasks/tenant-isolation-verification.md
mv LOCAL_DEVELOPMENT_LOGGING.md tasks/local-development-logging.md

# 计划文档
mv PERFORMANCE_OPTIMIZATION.md plans/performance-optimization-plan.md
mv DATABASE_OPTIMIZATION.md plans/database-optimization-plan.md
mv STRONG_TYPE_OPTIMIZATION.md plans/strong-type-optimization-plan.md

# 总结文档
mv PERFORMANCE_OPTIMIZATION_SUMMARY.md summaries/performance-optimization-summary.md
mv TEST_IMPLEMENTATION_SUMMARY.md summaries/test-implementation-summary.md
mv DOCUMENTATION_SUMMARY.md summaries/documentation-summary.md
mv FINAL_SUMMARY.md summaries/final-summary.md
mv LESSONS_LEARNED.md summaries/lessons-learned.md

# 参考文档
mv API_REFERENCE.md references/api-reference.md
mv COMMISSION_QUICK_REFERENCE.md references/commission-quick-reference.md
mv COMPLETE_BUSINESS_FLOW.md references/complete-business-flow.md

# 最佳实践
mv LOGGING_BEST_PRACTICES.md best-practices/logging-best-practices.md
mv code_PR.md best-practices/code-review.md
mv COMMIT_MESSAGE.md best-practices/commit-message.md
mv ENTERPRISE_CONFIG_SOLUTION.md best-practices/enterprise-config-solution.md

# 进度文档
mv DOCUMENTATION_PROGRESS.md progress/documentation-progress.md
```

### 3.3 迁移代码目录中的文档

```bash
cd apps/backend

# 创建模块参考文档目录
mkdir -p docs/references/modules

# Finance 模块（6个文件）
git mv src/module/finance/finance.md docs/references/modules/finance-module-overview.md
git mv src/module/finance/commission/commission.md docs/references/modules/finance-commission-overview.md
git mv src/module/finance/settlement/settlement.md docs/references/modules/finance-settlement-overview.md
git mv src/module/finance/wallet/wallet.md docs/references/modules/finance-wallet-overview.md
git mv src/module/finance/withdrawal/withdrawal.md docs/references/modules/finance-withdrawal-overview.md

# Finance 测试文档（4个文件）
git mv src/module/finance/README.TEST.md docs/testing/finance-test-readme.md
git mv src/module/finance/TEST_INDEX.md docs/testing/finance-test-index.md
git mv src/module/finance/TEST_SCRIPTS.md docs/testing/finance-test-scripts.md
git mv src/module/finance/TEST_SUMMARY.md docs/testing/finance-test-summary.md

# Marketing 模块（7个文件）
git mv src/module/marketing/marketing.md docs/references/modules/marketing-module-overview.md
git mv src/module/marketing/asset/asset.md docs/references/modules/marketing-asset-overview.md
git mv src/module/marketing/config/config.md docs/references/modules/marketing-config-overview.md
git mv src/module/marketing/instance/instance.md docs/references/modules/marketing-instance-overview.md
git mv src/module/marketing/play/play.md docs/references/modules/marketing-play-overview.md
git mv src/module/marketing/stock/stock.md docs/references/modules/marketing-stock-overview.md
git mv src/module/marketing/template/template.md docs/references/modules/marketing-template-overview.md

# Store 模块（7个文件）
git mv src/module/store/store.md docs/references/modules/store-module-overview.md
git mv src/module/store/distribution/distribution.md docs/references/modules/store-distribution-overview.md
git mv src/module/store/finance/finance.md docs/references/modules/store-finance-overview.md
git mv src/module/store/order/order.md docs/references/modules/store-order-overview.md
git mv src/module/store/product/product.md docs/references/modules/store-product-overview.md
git mv src/module/store/stock/stock.md docs/references/modules/store-stock-overview.md
git mv src/module/store/STORE_COMMISSION_AUDIT.md docs/references/store-commission-audit.md

# PMS 模块（4个文件）
git mv src/module/pms/pms.md docs/references/modules/pms-module-overview.md
git mv src/module/pms/attribute/attribute.md docs/references/modules/pms-attribute-overview.md
git mv src/module/pms/brand/brand.md docs/references/modules/pms-brand-overview.md
git mv src/module/pms/category/category.md docs/references/modules/pms-category-overview.md

# LBS 模块（4个文件）
git mv src/module/lbs/lbs.md docs/references/modules/lbs-module-overview.md
git mv src/module/lbs/geo/geo.md docs/references/modules/lbs-geo-overview.md
git mv src/module/lbs/region/region.md docs/references/modules/lbs-region-overview.md
git mv src/module/lbs/station/station.md docs/references/modules/lbs-station-overview.md

# Risk 模块（1个文件）
git mv src/module/risk/risk.md docs/references/modules/risk-module-overview.md

# Client 模块（14个文件）
git mv src/module/client/README.md docs/references/modules/client-module-overview.md
git mv src/module/client/address/address.md docs/references/modules/client-address-overview.md
git mv src/module/client/auth/auth.md docs/references/modules/client-auth-overview.md
git mv src/module/client/cart/cart.md docs/references/modules/client-cart-overview.md
git mv src/module/client/common/common.md docs/references/modules/client-common-overview.md
git mv src/module/client/finance/finance.md docs/references/modules/client-finance-overview.md
git mv src/module/client/location/location.md docs/references/modules/client-location-overview.md
git mv src/module/client/order/order.md docs/references/modules/client-order-overview.md
git mv src/module/client/payment/payment.md docs/references/modules/client-payment-overview.md
git mv src/module/client/product/product.md docs/references/modules/client-product-overview.md
git mv src/module/client/service/service.md docs/references/modules/client-service-overview.md
git mv src/module/client/upgrade/upgrade.md docs/references/modules/client-upgrade-overview.md
git mv src/module/client/user/user.md docs/references/modules/client-user-overview.md

# Admin 模块（2个文件）
git mv src/module/admin/member/member.md docs/references/modules/admin-member-overview.md
git mv src/module/admin/system/tenant-audit/README.md docs/references/modules/admin-tenant-audit-overview.md

# Common 模块（3个文件）
git mv src/module/common/axios/axios.md docs/references/modules/common-axios-overview.md
git mv src/module/common/bull/bull.md docs/references/modules/common-bull-overview.md
git mv src/module/common/redis/redis.md docs/references/modules/common-redis-overview.md
```

**统计**：

- docs/ 根目录文档：34 个
- src/module/ 代码目录文档：约 50 个
- **总计需要迁移**：约 84 个文档

### 3.4 更新文档内部链接

移动文件后，需要更新文档内部的相对路径引用。使用全局搜索替换：

```bash
# 示例：更新指向 QUICK_START.md 的链接
# 从: [快速开始](QUICK_START.md)
# 到: [快速开始](guides/quick-start.md)

# 示例：更新指向模块文档的链接
# 从: [Finance 模块](../../src/module/finance/finance.md)
# 到: [Finance 模块](references/modules/finance-module-overview.md)
```

### 3.5 更新 README.md

更新 `apps/backend/docs/README.md`，反映新的目录结构。

---

## 4. 验证清单

完成迁移后，验证以下内容：

- [ ] 所有 docs/ 根目录文档都已移动到对应目录
- [ ] 所有 src/module/ 中的文档都已迁移到 docs/references/modules/
- [ ] 所有文档都使用小写+连字符命名
- [ ] docs/ 根目录只保留 `README.md`
- [ ] src/module/ 目录中不再有 .md 文件
- [ ] 文档内部链接已更新
- [ ] `README.md` 索引已更新
- [ ] 所有文档可以正常访问

---

## 5. 后续维护

### 5.1 新增文档规范

新增文档时，必须：

1. 确定文档类型（guides/tasks/plans/summaries/references/best-practices/testing）
2. 使用小写+连字符命名
3. 放入对应目录
4. 更新 `README.md` 索引

### 5.2 文档命名示例

```
✅ 正确
- guides/quick-start.md
- tasks/architecture-optimization.md
- plans/performance-optimization-plan.md
- summaries/test-implementation-summary.md
- references/api-reference.md
- best-practices/logging-best-practices.md

❌ 错误
- QUICK_START.md                    # 大写
- Architecture_Optimization.md      # 混合大小写+下划线
- performance-optimization.md       # 未分类到目录
- TestImplementationSummary.md      # 驼峰命名
```

---

## 6. 注意事项

1. **备份**：执行迁移前，建议先备份整个 `docs/` 目录
2. **Git 历史**：使用 `git mv` 而非 `mv`，以保留文件历史
3. **分批执行**：可以分批次执行，避免一次性改动过大
4. **测试验证**：每批次执行后，验证文档链接是否正常

---

**执行人**：待定  
**预计耗时**：3-4 小时（包含代码目录文档迁移）  
**优先级**：P2（中优先级）
