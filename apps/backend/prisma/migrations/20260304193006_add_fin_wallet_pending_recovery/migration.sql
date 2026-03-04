-- Add missing columns to fin_wallet (schema was updated but migration was missing)
-- pending_recovery: 待回收余额（佣金回滚时余额不足）
-- status, frozen_reason, frozen_at, frozen_by: 钱包状态与冻结相关

-- CreateEnum WalletStatus (if not exists)
DO $$ BEGIN
  CREATE TYPE "WalletStatus" AS ENUM ('NORMAL', 'FROZEN', 'DISABLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add columns to fin_wallet
ALTER TABLE "fin_wallet" ADD COLUMN IF NOT EXISTS "pending_recovery" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "fin_wallet" ADD COLUMN IF NOT EXISTS "status" "WalletStatus" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "fin_wallet" ADD COLUMN IF NOT EXISTS "frozen_reason" VARCHAR(200);
ALTER TABLE "fin_wallet" ADD COLUMN IF NOT EXISTS "frozen_at" TIMESTAMP(3);
ALTER TABLE "fin_wallet" ADD COLUMN IF NOT EXISTS "frozen_by" TEXT;
