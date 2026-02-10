-- CreateEnum: CommissionBaseType (used by sys_dist_config)
DO $$ BEGIN
  CREATE TYPE "CommissionBaseType" AS ENUM ('ORIGINAL_PRICE', 'ACTUAL_PAID', 'ZERO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable sys_dist_config: add cross-tenant and commission columns
ALTER TABLE "sys_dist_config"
  ADD COLUMN IF NOT EXISTS "enable_cross_tenant" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "cross_tenant_rate" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS "cross_max_daily" DECIMAL(10,2) NOT NULL DEFAULT 500.00,
  ADD COLUMN IF NOT EXISTS "commission_base_type" "CommissionBaseType" NOT NULL DEFAULT 'ORIGINAL_PRICE',
  ADD COLUMN IF NOT EXISTS "max_commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.50;
