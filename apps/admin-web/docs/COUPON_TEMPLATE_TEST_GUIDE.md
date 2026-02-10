# 优惠券模板列表页 - 功能与测试说明

## 路由

- **路径**: `/marketing/coupon/template`
- **菜单**: 营销 → 优惠券 → 优惠券模板

## 接口与功能对应

| 功能      | 接口                                                 | 状态                                          |
| --------- | ---------------------------------------------------- | --------------------------------------------- |
| 分页查询  | GET `/admin/marketing/coupon/templates`              | ✅ 已实现                                     |
| 查询详情  | GET `/admin/marketing/coupon/templates/:id`          | ✅ 已实现（编辑时用列表行数据，未单独调详情） |
| 创建模板  | POST `/admin/marketing/coupon/templates`             | ✅ 已实现                                     |
| 更新模板  | PUT `/admin/marketing/coupon/templates/:id`          | ✅ 已实现                                     |
| 停用模板  | DELETE `/admin/marketing/coupon/templates/:id`       | ✅ 已实现                                     |
| 启用/停用 | PATCH `/admin/marketing/coupon/templates/:id/status` | ✅ 已实现（列表内状态开关）                   |

## 前后端字段对齐说明

- **后端** 使用：`type`（DISCOUNT/PERCENTAGE/EXCHANGE）、`discountAmount`/`discountPercent`、`minOrderAmount`、`totalStock`、`limitPerUser`、`validityType`（FIXED/RELATIVE）、`startTime`/`endTime`/`validDays`、`distributedCount`/`usedCount`。
- **前端** 列表与表单已按上述字段做了映射与展示；创建/编辑时由前端转换为后端 DTO，`tenantId`/`createBy` 未传时由后端从请求上下文注入。

## 测试数据

已提供种子脚本，在 **apps/backend** 下执行：

```bash
npx tsx prisma/seed-coupon-templates.ts
```

会为租户 `000000` 创建 3 条模板：

1. **新人满100减20** - 满减券，领取后 30 天有效
2. **全场9折券** - 折扣券，领取后 7 天有效
3. **周末满200减50** - 满减券，固定时间段有效

## 手动测试建议

1. **列表**：登录后台 → 营销 → 优惠券 → 优惠券模板，确认上述 3 条数据展示正常（类型、面值、门槛、发放/领取/使用、有效期、状态）。
2. **搜索**：按模板名称、类型（代金券/折扣券）、状态筛选，确认结果正确。
3. **新增**：点击「新增模板」，填写代金券或折扣券，提交后列表刷新且新记录出现。
4. **编辑**：对未发放过的模板点击编辑，修改名称或面值后保存，列表更新。
5. **停用**：点击行的删除图标，确认停用后该模板状态变为停用；或使用行内状态开关切换启用/停用。

## 已知说明

- 后端单元测试 `test/unit/coupon-template.service.spec.ts` 仍使用旧方法名（如 `createTemplate`）和旧枚举（如 `FULL_REDUCTION`），与当前服务实现不一致，需单独按当前 API 更新用例。
- 编辑时若模板已发放过，后端会拒绝更新并提示「已开始发放的模板不能修改」。
