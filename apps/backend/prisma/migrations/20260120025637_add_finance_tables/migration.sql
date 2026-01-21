-- CreateEnum
CREATE TYPE "TransType" AS ENUM ('COMMISSION_IN', 'WITHDRAW_OUT', 'REFUND_DEDUCT', 'CONSUME_PAY', 'RECHARGE_IN');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('FROZEN', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FAILED');

-- AlterTable
ALTER TABLE "gen_table" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "gen_table_column" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_client" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_config" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_dept" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_dict_data" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_dict_type" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_file_folder" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_file_share" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_job" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_job_log" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_logininfor" ALTER COLUMN "login_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_menu" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_notice" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_oper_log" ALTER COLUMN "oper_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_post" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_role" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_system_config" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_tenant" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_tenant_package" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_upload" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_user" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "fin_wallet" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "frozen" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalIncome" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pay_password" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_transaction" (
    "id" BIGSERIAL NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "TransType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "related_id" TEXT NOT NULL,
    "remark" VARCHAR(200),
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_commission" (
    "id" BIGSERIAL NOT NULL,
    "order_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "beneficiary_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "rate_snapshot" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "CommissionStatus" NOT NULL DEFAULT 'FROZEN',
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plan_settle_time" TIMESTAMP(3) NOT NULL,
    "settle_time" TIMESTAMP(3),

    CONSTRAINT "fin_commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_withdrawal" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" TEXT NOT NULL,
    "accountNo" TEXT,
    "realName" TEXT,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "audit_time" TIMESTAMP(3),
    "audit_by" TEXT,
    "audit_remark" TEXT,
    "payment_no" TEXT,
    "fail_reason" TEXT,
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fin_wallet_member_id_key" ON "fin_wallet"("member_id");

-- CreateIndex
CREATE INDEX "fin_wallet_tenant_id_member_id_idx" ON "fin_wallet"("tenant_id", "member_id");

-- CreateIndex
CREATE INDEX "fin_transaction_wallet_id_create_time_idx" ON "fin_transaction"("wallet_id", "create_time");

-- CreateIndex
CREATE INDEX "fin_transaction_tenant_id_type_idx" ON "fin_transaction"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "fin_commission_order_id_idx" ON "fin_commission"("order_id");

-- CreateIndex
CREATE INDEX "fin_commission_beneficiary_id_status_idx" ON "fin_commission"("beneficiary_id", "status");

-- CreateIndex
CREATE INDEX "fin_commission_tenant_id_status_plan_settle_time_idx" ON "fin_commission"("tenant_id", "status", "plan_settle_time");

-- CreateIndex
CREATE UNIQUE INDEX "fin_commission_order_id_beneficiary_id_level_key" ON "fin_commission"("order_id", "beneficiary_id", "level");

-- CreateIndex
CREATE INDEX "fin_withdrawal_tenant_id_status_idx" ON "fin_withdrawal"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "fin_withdrawal_member_id_create_time_idx" ON "fin_withdrawal"("member_id", "create_time");

-- AddForeignKey
ALTER TABLE "fin_wallet" ADD CONSTRAINT "fin_wallet_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "ums_member"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_transaction" ADD CONSTRAINT "fin_transaction_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "fin_wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_commission" ADD CONSTRAINT "fin_commission_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "ums_member"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_commission" ADD CONSTRAINT "fin_commission_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "oms_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_withdrawal" ADD CONSTRAINT "fin_withdrawal_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "ums_member"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;
