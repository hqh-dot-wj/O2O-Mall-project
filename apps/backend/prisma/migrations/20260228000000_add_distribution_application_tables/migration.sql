-- 分销员申请表 (T-9 分销员申请/审核)
-- 对应 Prisma model: SysDistApplication
CREATE TABLE IF NOT EXISTS "sys_dist_application" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" VARCHAR(20) NOT NULL,
  "member_id" VARCHAR(20) NOT NULL,
  "apply_reason" VARCHAR(500),
  "status" VARCHAR(20) NOT NULL,
  "reviewer_id" VARCHAR(20),
  "review_time" TIMESTAMP(3),
  "review_remark" VARCHAR(500),
  "auto_reviewed" BOOLEAN NOT NULL DEFAULT false,
  "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "update_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "sys_dist_application_tenant_id_member_id_status_key"
  ON "sys_dist_application"("tenant_id", "member_id", "status");
CREATE INDEX IF NOT EXISTS "sys_dist_application_tenant_id_status_idx"
  ON "sys_dist_application"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "sys_dist_application_member_id_idx"
  ON "sys_dist_application"("member_id");
CREATE INDEX IF NOT EXISTS "sys_dist_application_create_time_idx"
  ON "sys_dist_application"("create_time");

-- 分销员审核配置表 (T-9)
-- 对应 Prisma model: SysDistReviewConfig
CREATE TABLE IF NOT EXISTS "sys_dist_review_config" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" VARCHAR(20) NOT NULL UNIQUE,
  "enable_auto_review" BOOLEAN NOT NULL DEFAULT false,
  "min_register_days" INTEGER NOT NULL DEFAULT 0,
  "min_order_count" INTEGER NOT NULL DEFAULT 0,
  "min_order_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "require_real_name" BOOLEAN NOT NULL DEFAULT false,
  "require_phone" BOOLEAN NOT NULL DEFAULT true,
  "create_by" VARCHAR(64) NOT NULL,
  "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "update_by" VARCHAR(64) NOT NULL,
  "update_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
