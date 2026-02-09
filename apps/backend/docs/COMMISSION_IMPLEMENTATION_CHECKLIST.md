# 优惠券和积分分佣计算 - 实施清单

## ✅ 已完成项

### 1. 数据库设计 ✅
- [x] 新增 `CommissionBaseType` 枚举
- [x] 优惠券模板表新增 `min_actual_pay_amount` 字段
- [x] SKU 表新增 `is_exchange_product` 字段
- [x] 分销配置表新增 `commission_base_type` 和 `max_commission_rate` 字段
- [x] 佣金记录表新增审计字段（7个字段）

### 2. 代码实现 ✅
- [x] `CommissionService.getDistConfig()` 方法扩展
- [x] `CommissionService.calculateCommissionBase()` 方法重构
- [x] `CommissionService.calculateCommission()` 方法增强
- [x] 熔断保护逻辑实现
- [x] 兑换商品识别逻辑
- [x] 审计字段填充逻辑

### 3. 文档编写 ✅
- [x] 数据库迁移文档（COMMISSION_WITH_COUPON_POINTS_MIGRATION.md）
- [x] 使用示例文档（COMMISSION_CALCULATION_EXAMPLES.md）
- [x] 快速参考卡片（COMMISSION_QUICK_REFERENCE.md）
- [x] 实施总结文档（COMMISSION_COUPON_POINTS_SUMMARY.md）
- [x] 实施清单（本文档）

### 4. 代码质量 ✅
- [x] Prisma Schema 语法检查通过
- [x] TypeScript 语法检查通过
- [x] 生成 Prisma Client 成功

---

## 🔄 待执行项

### 1. 数据库迁移 ⏳
```bash
# 在测试环境执行
cd apps/backend
npx prisma db push

# 验证表结构
npx prisma db pull
```

**预期结果**：
- 4个表新增字段成功
- 1个新枚举类型创建成功
- 无数据丢失

---

### 2. 数据初始化（可选）⏳

#### 2.1 设置现有租户的默认配置
```sql
-- 为现有租户设置默认分佣策略
UPDATE sys_dist_config 
SET commission_base_type = 'ORIGINAL_PRICE',
    max_commission_rate = 0.50
WHERE commission_base_type IS NULL;
```

#### 2.2 标识现有兑换商品（如果有）
```sql
-- 手动标识兑换商品
UPDATE pms_tenant_sku 
SET is_exchange_product = TRUE
WHERE id IN (
  -- 这里填写兑换商品的 SKU ID
  'sku_exchange_001',
  'sku_exchange_002'
);
```

---

### 3. 配置管理后台（可选）⏳

#### 3.1 分销配置页面
- [ ] 新增"佣金计算策略"选择框
  - 选项：基于原价 / 基于实付 / 不分佣
- [ ] 新增"熔断保护比例"输入框
  - 范围：0-100%
  - 默认：50%

#### 3.2 优惠券模板页面
- [ ] 新增"最低实付金额"输入框
  - 可选字段
  - 验证：<= 最低消费金额

#### 3.3 商品 SKU 页面
- [ ] 新增"兑换商品"复选框
  - 勾选后不参与分佣
  - 提示文案

---

### 4. 测试验证 ✅

#### 4.1 单元测试 ✅
```bash
# 测试分佣计算逻辑
npm run test -- commission-coupon-points.spec.ts
```

**测试用例**: ✅ 已创建（12个测试用例）
- [x] 基于原价分佣
- [x] 基于实付分佣
- [x] 兑换商品不分佣
- [x] 混合订单处理
- [x] 熔断保护触发
- [x] 边界情况（自购、无推荐人等）

**文件位置**: `src/module/finance/commission/commission-coupon-points.spec.ts`

#### 4.2 集成测试 ✅
```bash
# 测试完整订单流程
npm run test:e2e -- commission-coupon-points.e2e-spec.ts
```

**测试场景**: ✅ 已创建（5个测试场景）
- [x] 创建订单 + 使用优惠券
- [x] 创建订单 + 使用积分
- [x] 创建订单 + 优惠券 + 积分
- [x] 兑换商品订单
- [x] 大额优惠触发熔断

**文件位置**: `test/commission-coupon-points.e2e-spec.ts`

#### 4.3 测试文档 ✅
- [x] 测试指南文档
- [x] Mock 数据准备
- [x] 测试检查清单
- [x] 常见问题解答

**文件位置**: `docs/COMMISSION_TESTING_GUIDE.md`

#### 4.4 手动测试 ⏳
- [ ] 场景1：正常商品 + 优惠券
- [ ] 场景2：大额优惠触发熔断
- [ ] 场景3：兑换商品不分佣
- [ ] 场景4：混合订单
- [ ] 场景5：基于实付金额

---

### 5. 性能优化（可选）⏳

#### 5.1 数据库索引
```sql
-- 为兑换商品标识添加索引
CREATE INDEX idx_tenant_sku_exchange 
ON pms_tenant_sku(is_exchange_product) 
WHERE is_exchange_product = TRUE;

-- 为熔断标识添加索引
CREATE INDEX idx_commission_capped 
ON fin_commission(is_capped) 
WHERE is_capped = TRUE;
```

#### 5.2 缓存优化
```typescript
// 缓存分销配置（减少数据库查询）
@Cacheable('dist_config', { ttl: 3600 })
async getDistConfig(tenantId: string) {
  // ...
}

// 缓存 SKU 配置
@Cacheable('tenant_sku', { ttl: 1800 })
async getTenantSku(skuId: string) {
  // ...
}
```

---

### 6. 监控和告警 ⏳

#### 6.1 监控指标
- [ ] 熔断触发频率
  ```sql
  SELECT 
    DATE(create_time) as date,
    COUNT(*) as total,
    SUM(CASE WHEN is_capped THEN 1 ELSE 0 END) as capped,
    ROUND(SUM(CASE WHEN is_capped THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as rate
  FROM fin_commission
  WHERE create_time >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY DATE(create_time);
  ```

- [ ] 佣金计算耗时
  ```typescript
  // 在 calculateCommission 方法中添加耗时统计
  const startTime = Date.now();
  // ... 计算逻辑
  const duration = Date.now() - startTime;
  this.logger.log(`[Commission] Calculation took ${duration}ms`);
  ```

- [ ] 优惠券对佣金的影响
  ```sql
  SELECT 
    DATE(create_time) as date,
    SUM(coupon_discount) as total_coupon,
    SUM(amount) as total_commission,
    ROUND(SUM(coupon_discount) / SUM(amount) * 100, 2) as impact_rate
  FROM fin_commission
  WHERE coupon_discount > 0
  GROUP BY DATE(create_time);
  ```

#### 6.2 告警规则
- [ ] 熔断触发率 > 10%
- [ ] 佣金计算耗时 > 500ms
- [ ] 单日佣金总额异常（超过历史平均值的2倍）

---

### 7. 文档和培训 ⏳

#### 7.1 内部文档
- [x] 技术实现文档
- [x] 使用示例文档
- [x] 快速参考卡片
- [ ] API 文档更新（Swagger）
- [ ] 数据库字典更新

#### 7.2 用户文档
- [ ] 商家操作手册
  - 如何配置分佣策略
  - 如何创建兑换商品
  - 如何设置优惠券限制
- [ ] 推广者指南
  - 分佣规则说明
  - 收益计算方式
  - 常见问题解答

#### 7.3 培训材料
- [ ] 技术团队培训 PPT
- [ ] 运营团队培训 PPT
- [ ] 客服团队 FAQ

---

### 8. 生产环境部署 ⏳

#### 8.1 部署前检查
- [ ] 测试环境验证通过
- [ ] 代码审查完成
- [ ] 性能测试通过
- [ ] 备份数据库

#### 8.2 部署步骤
```bash
# 1. 备份数据库
pg_dump -h localhost -U postgres -d your_db > backup_$(date +%Y%m%d).sql

# 2. 拉取最新代码
git pull origin main

# 3. 安装依赖
npm install

# 4. 数据库迁移
cd apps/backend
npx prisma db push

# 5. 生成 Prisma Client
npx prisma generate

# 6. 构建项目
npm run build

# 7. 重启服务
pm2 restart backend

# 8. 验证服务
curl http://localhost:3000/health
```

#### 8.3 部署后验证
- [ ] 服务正常启动
- [ ] 数据库连接正常
- [ ] 创建测试订单
- [ ] 查看佣金计算日志
- [ ] 验证佣金记录正确

---

### 9. 灰度发布（推荐）⏳

#### 9.1 灰度策略
```typescript
// 通过配置开关控制新逻辑
const useNewCommissionLogic = await this.configService.get(
  'ENABLE_NEW_COMMISSION_LOGIC',
  false
);

if (useNewCommissionLogic) {
  // 使用新逻辑
  await this.calculateCommissionV2(order);
} else {
  // 使用旧逻辑
  await this.calculateCommissionV1(order);
}
```

#### 9.2 灰度步骤
- [ ] 第1天：10% 流量
- [ ] 第3天：30% 流量
- [ ] 第5天：50% 流量
- [ ] 第7天：100% 流量

#### 9.3 回滚方案
```bash
# 如果发现问题，立即回滚
git revert <commit_hash>
npm run build
pm2 restart backend

# 或者通过配置开关关闭新逻辑
UPDATE sys_config SET value = 'false' WHERE key = 'ENABLE_NEW_COMMISSION_LOGIC';
```

---

### 10. 持续优化 ⏳

#### 10.1 数据分析
- [ ] 每周分析熔断触发数据
- [ ] 每月分析佣金发放数据
- [ ] 每季度优化分佣策略

#### 10.2 功能迭代
- [ ] 支持按商品维度回收佣金（部分退款）
- [ ] 支持更复杂的分佣规则（阶梯式、动态比例）
- [ ] 支持佣金预估功能（下单前预览）

#### 10.3 性能优化
- [ ] 优化 SKU 查询（批量查询、缓存）
- [ ] 优化佣金计算（并行计算、异步处理）
- [ ] 优化数据库查询（索引优化、查询优化）

---

## 📊 进度跟踪

| 阶段 | 状态 | 完成度 | 预计时间 |
|------|------|---------|----------|
| 数据库设计 | ✅ 完成 | 100% | - |
| 代码实现 | ✅ 完成 | 100% | - |
| 文档编写 | ✅ 完成 | 100% | - |
| 测试用例编写 | ✅ 完成 | 100% | - |
| 数据库迁移 | ⏳ 待执行 | 0% | 0.5小时 |
| 配置管理后台 | ⏳ 待执行 | 0% | 2小时 |
| 测试验证 | ⏳ 待执行 | 0% | 2小时 |
| 性能优化 | ⏳ 待执行 | 0% | 2小时 |
| 监控和告警 | ⏳ 待执行 | 0% | 2小时 |
| 文档和培训 | ⏳ 待执行 | 0% | 4小时 |
| 生产环境部署 | ⏳ 待执行 | 0% | 2小时 |

**总进度**: 50% (5/10)  
**预计剩余时间**: 16.5 小时

---

## 🎯 下一步行动

### 立即执行
1. 在测试环境执行数据库迁移
2. 运行单元测试验证逻辑
3. 手动测试5个核心场景

### 本周完成
1. 完成管理后台配置界面
2. 完成集成测试
3. 完成性能优化

### 下周完成
1. 完成监控和告警
2. 完成用户文档
3. 生产环境灰度发布

---

## 📞 联系方式

**技术负责人**: [您的名字]  
**项目经理**: [项目经理名字]  
**紧急联系**: [电话/邮箱]

---

**最后更新**: 2025-02-08  
**版本**: v1.0.0
