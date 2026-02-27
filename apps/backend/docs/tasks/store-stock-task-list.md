# 门店库存管理模块任务清单

> 来源：`apps/backend/docs/requirements/store/stock/stock-requirements.md`
> 创建时间：2026-02-27
> 架构审查：待补充
> 模块相态：成长态（与 store/product 同属营销/金融/门店分组）

---

## 架构审查

### 相态判断

门店库存管理模块属于「营销/金融/门店」分组，当前处于成长态：

- 模块变更频率：与 store/product 相近
- 需求确定性：~60%（核心查询/增减稳定，审计、流水、预警等需求在演进）
- 四棱镜权重：短期与中期并重

### 四棱镜扫描

| 棱镜       | 审查结论 | 说明                                                                                                |
| ---------- | -------- | --------------------------------------------------------------------------------------------------- |
| 业务价值   | ✅       | 短期任务直接修复 P1 缺陷（权限、审计、变动原因），业务价值明确                                      |
| 时间棱镜   | ⚠️       | T-6 改用 TenantSkuRepository 需核对 stock.service 与 product 模块的 include 结构是否一致，建议 2-3h |
| 能力棱镜   | ✅       | store/product 已有 TenantSkuRepository 成熟实践，可复用                                             |
| 复杂性棱镜 | ✅       | 库存模块职责单一，改动范围清晰                                                                      |

### 需求补全检查

- [x] 模块边界清晰（§1.3 范围表已明确 in/out scope）
- [x] 与 store/order 的自动扣减边界已区分
- [ ] D-5（findUnique 竞态窗口）需求文档未明确是否必须修复，可纳入 T-6 一并评估

---

## 短期任务（1-2 周）— 修复现有缺陷

- [x] T-1: 添加 `@RequirePermission` 和 `@ApiBearerAuth` 装饰器 (0.5h) ✅ 2026-02-27
  - 对应缺陷：D-1, D-2
  - 权限标识：`store:stock:list`、`store:stock:update`
- [x] T-2: 库存更新接口添加 `@Operlog` 装饰器 (0.5h) ✅ 2026-02-27
  - 对应缺陷：D-3
- [x] T-3: `UpdateStockDto` 增加 `reason` 字段（变动原因）(0.5h) ✅ 2026-02-27
  - 对应缺陷：D-4
- [x] T-4: `UpdateStockDto` 增加 `stockChange` 非零校验 (0.1h) ✅ 2026-02-27
  - 对应缺陷：D-9
- [x] T-5: 修复单元测试使其与实际实现匹配 (1h) ✅ 2026-02-27
  - 对应缺陷：D-8
- [x] T-6: Service 改用 `TenantSkuRepository`，消除与 store/product 的重复 (2-3h) ✅ 2026-02-27
  - 对应缺陷：D-7, A-7
  - 新增 `updateStockForTenant`、`findStockList` 方法

## 中期任务（1-2 月）— 补齐核心功能

- [x] T-7: 库存变动流水表（`pms_stock_log`）+ 每次变更自动写入 (2-3d) ✅ 2026-02-27
  - 对应差距：A-1
  - 迁移：20260227100000_add_pms_stock_log
- [x] T-8: 批量调整库存接口 (1-2d) ✅ 2026-02-27
  - 对应差距：A-3
  - POST /store/stock/batch/update，支持多 SKU 独立变动值
- [x] T-9: 库存预警（阈值配置 + 定时扫描 + 消息通知）(2-3d) ✅ 已在 store/product 实现
  - 对应差距：A-2
- [x] T-10: 库存导出（Excel）(1-2d) ✅ 2026-02-27
  - 对应差距：A-5
  - GET /store/stock/export，支持按商品名称筛选

## 长期任务（3-6 月）— 竞争力建设

- [ ] T-11: 库存盘点功能（实际盘点数 vs 系统库存对比，生成差异报告）
- [ ] T-12: 库存冻结/解冻（支持活动预留库存）
- [ ] T-13: 可售/锁定库存分离（下单锁定 → 支付扣减 → 取消释放）
- [ ] T-14: 库存导入（Excel 批量）
