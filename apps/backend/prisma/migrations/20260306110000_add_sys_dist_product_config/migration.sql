-- 商品级分佣配置表 (T-6 商品/等级分佣)
-- 对应 Prisma model: SysDistProductConfig
-- 用于覆盖租户默认配置，支持按商品或品类设置独立分佣比例
CREATE TABLE IF NOT EXISTS "sys_dist_product_config" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" VARCHAR(20) NOT NULL,
  "product_id" VARCHAR(50),
  "category_id" VARCHAR(50),
  "level1_rate" DECIMAL(5, 2),
  "level2_rate" DECIMAL(5, 2),
  "commission_base_type" "CommissionBaseType",
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "create_by" VARCHAR(64) NOT NULL,
  "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "update_by" VARCHAR(64) NOT NULL,
  "update_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "uk_tenant_product"
  ON "sys_dist_product_config"("tenant_id", "product_id")
  WHERE "product_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "uk_tenant_category"
  ON "sys_dist_product_config"("tenant_id", "category_id")
  WHERE "category_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "sys_dist_product_config_tenant_id_is_active_idx"
  ON "sys_dist_product_config"("tenant_id", "is_active");
