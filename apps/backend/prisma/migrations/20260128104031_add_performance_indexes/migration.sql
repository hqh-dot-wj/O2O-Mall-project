-- 为 Store 模块添加性能优化索引
-- 用途: 提升订单、佣金、租户SKU等核心查询性能

-- ========== 订单表索引 ==========

-- 索引1: 租户+状态+创建时间 (订单列表查询)
-- 场景: SELECT * FROM oms_order WHERE tenant_id = ? AND status = ? ORDER BY create_time DESC
CREATE INDEX IF NOT EXISTS "idx_order_tenant_status_time" 
ON "oms_order"("tenant_id", "status", "create_time" DESC);

-- 索引2: 会员+创建时间 (会员订单历史)
-- 场景: SELECT * FROM oms_order WHERE member_id = ? ORDER BY create_time DESC
CREATE INDEX IF NOT EXISTS "idx_order_member_time" 
ON "oms_order"("member_id", "create_time" DESC);

-- 索引3: 租户+支付状态+创建时间 (财务流水查询)
-- 场景: SELECT * FROM oms_order WHERE tenant_id = ? AND pay_status = 'PAID' ORDER BY create_time DESC
CREATE INDEX IF NOT EXISTS "idx_order_pay_status_time" 
ON "oms_order"("tenant_id", "pay_status", "create_time" DESC);

-- ========== 佣金表索引 ==========

-- 索引1: 租户+受益人+创建时间 (佣金列表查询)
-- 场景: SELECT * FROM fin_commission WHERE tenant_id = ? AND beneficiary_id = ? ORDER BY create_time DESC
CREATE INDEX IF NOT EXISTS "idx_commission_tenant_beneficiary_time" 
ON "fin_commission"("tenant_id", "beneficiary_id", "create_time" DESC);

-- 索引2: 跨店日限额检查 (并发安全)
-- 场景: SELECT SUM(amount) FROM fin_commission 
--       WHERE tenant_id = ? AND beneficiary_id = ? AND is_cross_tenant = true 
--       AND DATE(create_time) = CURDATE() AND status != 'CANCELLED'
CREATE INDEX IF NOT EXISTS "idx_commission_cross_tenant_daily" 
ON "fin_commission"("tenant_id", "beneficiary_id", "is_cross_tenant", "create_time", "status");

-- 索引3: 订单佣金查询 (订单详情)
-- 场景: SELECT * FROM fin_commission WHERE order_id = ?
CREATE INDEX IF NOT EXISTS "idx_commission_order" 
ON "fin_commission"("order_id");

-- ========== 租户SKU表索引 ==========

-- 索引1: 乐观锁查询 (并发更新)
-- 场景: UPDATE pms_tenant_sku SET ... WHERE id = ? AND version = ?
-- 注意: 此索引已在之前的迁移中创建,这里检查是否存在
CREATE INDEX IF NOT EXISTS "idx_tenant_sku_version" 
ON "pms_tenant_sku"("id", "version");

-- 索引2: 租户+商品 (商品SKU列表)
-- 场景: SELECT * FROM pms_tenant_sku WHERE tenant_id = ? AND tenant_prod_id = ?
CREATE INDEX IF NOT EXISTS "idx_tenant_sku_tenant_product" 
ON "pms_tenant_sku"("tenant_id", "tenant_prod_id");

-- ========== 提现表索引 ==========

-- 索引1: 租户+状态+创建时间 (财务流水查询)
-- 场景: SELECT * FROM fin_withdrawal WHERE tenant_id = ? AND status = 'APPROVED' ORDER BY create_time DESC
CREATE INDEX IF NOT EXISTS "idx_withdrawal_tenant_status_time" 
ON "fin_withdrawal"("tenant_id", "status", "create_time" DESC);

-- 索引2: 会员+创建时间 (会员提现历史)
-- 场景: SELECT * FROM fin_withdrawal WHERE member_id = ? ORDER BY create_time DESC
CREATE INDEX IF NOT EXISTS "idx_withdrawal_member_time" 
ON "fin_withdrawal"("member_id", "create_time" DESC);

-- ========== 钱包流水表索引 ==========

-- 索引1: 租户+类型+创建时间 (财务流水查询)
-- 场景: SELECT * FROM fin_transaction WHERE tenant_id = ? AND type != 'COMMISSION_IN' ORDER BY create_time DESC
CREATE INDEX IF NOT EXISTS "idx_transaction_tenant_type_time" 
ON "fin_transaction"("tenant_id", "type", "create_time" DESC);

-- 索引2: 钱包+创建时间 (会员流水历史)
-- 场景: SELECT * FROM fin_transaction WHERE wallet_id = ? ORDER BY create_time DESC
CREATE INDEX IF NOT EXISTS "idx_transaction_wallet_time" 
ON "fin_transaction"("wallet_id", "create_time" DESC);

-- ========== 性能说明 ==========
-- 1. 所有涉及分页查询的表都添加了复合索引(过滤字段 + 排序字段)
-- 2. 跨店佣金限额检查使用专门的索引,支持 FOR UPDATE 锁定
-- 3. 乐观锁查询使用 (id, version) 复合索引,提升并发性能
-- 4. 所有索引都使用 IF NOT EXISTS,避免重复创建错误
