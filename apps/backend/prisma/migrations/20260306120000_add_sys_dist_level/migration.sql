-- 分销员等级定义表 (T-8 分销员等级体系)
-- 对应 Prisma model: SysDistLevel
CREATE TABLE IF NOT EXISTS "sys_dist_level" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" VARCHAR(20) NOT NULL,
  "level_id" INTEGER NOT NULL,
  "level_name" VARCHAR(50) NOT NULL,
  "level_icon" VARCHAR(255),
  "level1_rate" DECIMAL(5, 4) NOT NULL,
  "level2_rate" DECIMAL(5, 4) NOT NULL,
  "upgrade_condition" JSONB,
  "maintain_condition" JSONB,
  "benefits" TEXT,
  "sort" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "create_by" VARCHAR(64) NOT NULL,
  "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "update_by" VARCHAR(64) NOT NULL,
  "update_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "sys_dist_level_tenant_id_level_id_key"
  ON "sys_dist_level"("tenant_id", "level_id");
CREATE INDEX IF NOT EXISTS "sys_dist_level_tenant_id_is_active_idx"
  ON "sys_dist_level"("tenant_id", "is_active");

-- 分销员等级变更日志表
-- 对应 Prisma model: SysDistLevelLog
CREATE TABLE IF NOT EXISTS "sys_dist_level_log" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" VARCHAR(20) NOT NULL,
  "member_id" VARCHAR(20) NOT NULL,
  "from_level" INTEGER NOT NULL,
  "to_level" INTEGER NOT NULL,
  "change_type" VARCHAR(20) NOT NULL,
  "reason" VARCHAR(255),
  "operator" VARCHAR(64),
  "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "sys_dist_level_log_tenant_id_member_id_idx"
  ON "sys_dist_level_log"("tenant_id", "member_id");
CREATE INDEX IF NOT EXISTS "sys_dist_level_log_create_time_idx"
  ON "sys_dist_level_log"("create_time");
