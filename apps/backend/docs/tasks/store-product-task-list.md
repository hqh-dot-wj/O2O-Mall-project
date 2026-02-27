# 门店商品管理模块任务清单

> 来源：`apps/backend/docs/requirements/store/product/product-requirements.md`
> 创建时间：2026-02-27
> 架构审查：⚠️ 补充（见下方备注）
> 模块相态：成长态（需求确定性 ~60%，月变更 5-8 次，参照 architecture-meta-model §0.6 营销/金融/门店分组）

---

## 架构审查

### 相态判断

门店商品管理模块属于「营销/金融/门店」分组，当前处于成长态：

- 模块变更频率：~5-8 次/月
- 需求确定性：~60%（核心 CRUD 稳定，但批量操作、库存预警等需求仍在演进）
- 团队熟悉度：3-5 人了解
- 四棱镜权重：短期与中期并重，技术 ROI 必须明确

### 四棱镜扫描

| 棱镜       | 审查结论 | 说明                                                                                                                                                                      |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 业务价值   | ✅       | 所有短期任务直接修复安全隐患（D-1 权限缺失）或代码规范问题（D-2 事务、D-9 Repository），业务价值明确                                                                      |
| 时间棱镜   | ⚠️       | T-5（Service 改用 Repository）工时估算 2h 偏低——Service 当前直接使用 `prisma` 操作 6 处以上，需逐一替换并验证关联查询的 include 结构与 Repository 方法是否匹配，建议 3-4h |
| 能力棱镜   | ✅       | 团队熟悉 NestJS + Prisma + Bull 模式，store/order 和 store/finance 已有 `@RequirePermission` 和 `@Transactional()` 的成熟实践，无单点风险                                 |
| 复杂性棱镜 | ⚠️       | T-5 改用 Repository 后，需确认 Repository 的 `findWithRelations` 返回结构与 Service 中现有的 `include` 查询结构一致，否则会破坏 VO 映射逻辑                               |

### 需求补全检查

- [x] 模块边界清晰（§1.3 范围表已明确 in/out scope）
- [x] 跨模块连接已识别（Bull 队列与 admin/product 的下架同步）
- [ ] ⚠️ D-3（storeId 参数覆盖租户隔离）需求文档建议增加 `@RequireRole('superadmin')`，但项目中 store 模块其他 Controller 使用的是 `@RequirePermission`，需确认 HQ 跨店查询的权限标识命名（建议 `store:product:list:cross`）
- [x] 风险信号已预设（见下方监控项）
- [x] 无 AI 相关功能，约束波动性不适用

### 审查结论：⚠️ 补充

- 补充点 1：T-5 工时调整为 3-4h，需逐一核对 Repository 方法与 Service 中 Prisma 直接查询的 include 结构是否一致
- 补充点 2：D-3 的 HQ 跨店查询权限方案需确认——建议使用 `@RequirePermission('store:product:list')` 统一，在 Service 层通过角色判断是否允许 storeId 覆盖（与 store/order 模式对齐）
- 补充点 3：product.module.ts 已注册 BullModule.registerQueue 和 Producer/Consumer（代码审查发现 D-6 已修复），需求文档中 D-6 描述已过时，任务清单中移除 T-4
- 上线后监控项：权限装饰器添加后，监控 403 错误率是否异常升高（可能影响现有前端调用）

---

## 短期任务（1-2 周）

- [x] T-1: 为 6 个 Controller 端点添加 `@RequirePermission` 装饰器 (1h) ✅ 2026-02-27
- [x] T-2: `importProduct` 改用 `@Transactional()` 装饰器 (1h) ✅ 2026-02-27
- [x] T-3: `findAll` 的 `storeId` 参数增加 HQ 角色/权限校验 (1h) ✅ 2026-02-27
- [x] T-5: `product.service.ts` 改用 `TenantProductRepository` 和 `TenantSkuRepository` (3-4h) ✅ 2026-02-27
- [x] T-6: `updateProductPrice` 乐观锁更新改为事务内完成或使用 `update` 直接返回 (1h) ✅ 2026-02-27

## 中期任务（1-2 月）

- [x] T-7: 批量导入商品（选品中心多选 → 批量导入）(2-3d) ✅ 2026-02-27
- [x] T-8: 从店铺移除商品（硬删除 + 关联 SKU 清理）(1-2d) ✅ 2026-02-27
- [x] T-9: SKU 重新同步（重新导入时 upsert 更新已有 SKU）(1d) ✅ 2026-02-27
- [x] T-10: 批量调价（选择多个 SKU 统一调整价格/分销配置）(2d) ✅ 2026-02-27
- [x] T-11: 库存预警（低库存阈值配置 + 消息通知）(2-3d) ✅ 2026-02-27

## 长期任务（3-6 月）

- [ ] T-12: 店铺级商品分类管理 (3-5d)
- [ ] T-13: 商品数据分析（浏览量、转化率、销量趋势）(5-10d)
- [ ] T-14: 商品评价管理 (3-5d)
- [ ] T-15: 选品中心智能推荐 (5-10d)
