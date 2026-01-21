-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('1', '2', '3', '4', '5', '6');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('1', '2', '3');

-- CreateEnum
CREATE TYPE "PayStatus" AS ENUM ('0', '1', '2');

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
CREATE TABLE "sys_dist_config" (
    "id" SERIAL NOT NULL,
    "tenant_id" VARCHAR(20) NOT NULL,
    "level1_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.60,
    "level2_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.40,
    "enable_lv0" BOOLEAN NOT NULL DEFAULT true,
    "create_by" VARCHAR(64) NOT NULL DEFAULT '',
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(64) NOT NULL DEFAULT '',
    "update_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sys_dist_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_dist_config_log" (
    "id" SERIAL NOT NULL,
    "tenant_id" VARCHAR(20) NOT NULL,
    "level1_rate" DECIMAL(5,2) NOT NULL,
    "level2_rate" DECIMAL(5,2) NOT NULL,
    "enable_lv0" BOOLEAN NOT NULL,
    "operator" VARCHAR(64) NOT NULL,
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sys_dist_config_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oms_cart_item" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "product_name" TEXT NOT NULL,
    "product_img" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "spec_data" JSONB,
    "share_user_id" TEXT,
    "service_date" TIMESTAMP(3),
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oms_cart_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oms_order" (
    "id" TEXT NOT NULL,
    "order_sn" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_type" "OrderType" NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "freight_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pay_amount" DECIMAL(10,2) NOT NULL,
    "receiver_name" TEXT,
    "receiver_phone" TEXT,
    "receiver_address" TEXT,
    "receiver_lat" DOUBLE PRECISION,
    "receiver_lng" DOUBLE PRECISION,
    "booking_time" TIMESTAMP(3),
    "worker_id" INTEGER,
    "service_remark" TEXT,
    "share_user_id" TEXT,
    "referrer_id" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT '1',
    "pay_status" "PayStatus" NOT NULL DEFAULT '0',
    "pay_type" TEXT,
    "transaction_id" TEXT,
    "pay_time" TIMESTAMP(3),
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_time" TIMESTAMP(3) NOT NULL,
    "delete_time" TIMESTAMP(3),
    "remark" VARCHAR(500),

    CONSTRAINT "oms_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oms_order_item" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_img" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "spec_data" JSONB,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "oms_order_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sys_dist_config_tenant_id_key" ON "sys_dist_config"("tenant_id");

-- CreateIndex
CREATE INDEX "sys_dist_config_log_tenant_id_create_time_idx" ON "sys_dist_config_log"("tenant_id", "create_time");

-- CreateIndex
CREATE INDEX "oms_cart_item_member_id_tenant_id_idx" ON "oms_cart_item"("member_id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "oms_cart_item_member_id_tenant_id_sku_id_key" ON "oms_cart_item"("member_id", "tenant_id", "sku_id");

-- CreateIndex
CREATE UNIQUE INDEX "oms_order_order_sn_key" ON "oms_order"("order_sn");

-- CreateIndex
CREATE INDEX "oms_order_member_id_status_idx" ON "oms_order"("member_id", "status");

-- CreateIndex
CREATE INDEX "oms_order_tenant_id_create_time_idx" ON "oms_order"("tenant_id", "create_time");

-- CreateIndex
CREATE INDEX "oms_order_item_order_id_idx" ON "oms_order_item"("order_id");

-- AddForeignKey
ALTER TABLE "oms_order_item" ADD CONSTRAINT "oms_order_item_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "oms_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
