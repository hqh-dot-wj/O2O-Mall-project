-- AlterTable fin_commission: 添加佣金计算详情与跨店相关列
-- 对应 schema.prisma 中 FinCommission 模型的新增字段

-- 1. 添加 commission_base (分佣基数)，先加列再回填再设非空
ALTER TABLE "fin_commission"
  ADD COLUMN IF NOT EXISTS "commission_base" DECIMAL(10,2);

-- 回填已有记录：用 amount 作为 commission_base 的合理近似（commission_base >= amount）
UPDATE "fin_commission"
SET "commission_base" = "amount"
WHERE "commission_base" IS NULL;

-- 设为非空
ALTER TABLE "fin_commission"
  ALTER COLUMN "commission_base" SET NOT NULL;

-- 2. 添加 commission_base_type（基数类型快照，可空）
ALTER TABLE "fin_commission"
  ADD COLUMN IF NOT EXISTS "commission_base_type" "CommissionBaseType";

-- 3. 添加订单金额快照字段（可空）
ALTER TABLE "fin_commission"
  ADD COLUMN IF NOT EXISTS "order_original_price" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "order_actual_paid" DECIMAL(10,2);

-- 4. 添加优惠抵扣字段（可空，默认0）
ALTER TABLE "fin_commission"
  ADD COLUMN IF NOT EXISTS "coupon_discount" DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "points_discount" DECIMAL(10,2) DEFAULT 0;

-- 5. 添加 is_capped（是否触发熔断）
ALTER TABLE "fin_commission"
  ADD COLUMN IF NOT EXISTS "is_capped" BOOLEAN NOT NULL DEFAULT false;

-- 6. 添加 is_cross_tenant（是否跨店佣金）
ALTER TABLE "fin_commission"
  ADD COLUMN IF NOT EXISTS "is_cross_tenant" BOOLEAN NOT NULL DEFAULT false;
