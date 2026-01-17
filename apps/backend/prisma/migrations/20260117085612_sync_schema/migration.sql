/*
  Warnings:

  - The `status` column on the `sys_client` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `del_flag` column on the `sys_client` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sys_config` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `del_flag` column on the `sys_config` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sys_dept` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `del_flag` column on the `sys_dept` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sys_dict_data` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `del_flag` column on the `sys_dict_data` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sys_dict_type` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `del_flag` column on the `sys_dict_type` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sys_file_folder` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `del_flag` column on the `sys_file_folder` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sys_file_share` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sys_job` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `del_flag` column on the `sys_logininfor` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `del_flag` column on the `sys_menu` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sys_notice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `del_flag` column on the `sys_notice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sys_post` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `del_flag` column on the `sys_post` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sys_role` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `del_flag` column on the `sys_role` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sys_system_config` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `del_flag` column on the `sys_system_config` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sys_tenant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `del_flag` column on the `sys_tenant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sys_tenant_package` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `del_flag` column on the `sys_tenant_package` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sys_upload` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `del_flag` column on the `sys_upload` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sys_user` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `del_flag` column on the `sys_user` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `status` on the `gen_table` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `del_flag` on the `gen_table` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `gen_table_column` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `del_flag` on the `gen_table_column` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `sys_job_log` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `sys_logininfor` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `sys_menu` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `sys_oper_log` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('0', '1');

-- CreateEnum
CREATE TYPE "DelFlag" AS ENUM ('0', '1');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('1', '2');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('MP_MALL', 'MP_WORK', 'APP_MAIN');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('1', '2', '3', '4');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('0', '1', '2');

-- CreateEnum
CREATE TYPE "WorkerLevel" AS ENUM ('1', '2', '3', '4');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('0', '1', '2');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('1', '2');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('1', '2');

-- CreateEnum
CREATE TYPE "WageType" AS ENUM ('1', '2', '3');

-- CreateEnum
CREATE TYPE "AttrUsageType" AS ENUM ('PARAM', 'SPEC');

-- CreateEnum
CREATE TYPE "SettleType" AS ENUM ('WALLET', 'BANK');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('REAL', 'SERVICE');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('OFF_SHELF', 'ON_SHELF');

-- CreateEnum
CREATE TYPE "DistributionMode" AS ENUM ('RATIO', 'FIXED', 'NONE');

-- AlterTable
ALTER TABLE "gen_table" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL,
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL,
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "gen_table_column" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL,
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL,
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_client" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT '0',
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL DEFAULT '0',
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_config" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT '0',
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL DEFAULT '0';

-- AlterTable
ALTER TABLE "sys_dept" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT '0',
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL DEFAULT '0',
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_dict_data" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT '0',
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL DEFAULT '0';

-- AlterTable
ALTER TABLE "sys_dict_type" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT '0',
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL DEFAULT '0';

-- AlterTable
ALTER TABLE "sys_file_folder" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT '0',
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL DEFAULT '0',
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_file_share" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT '0',
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_job" DROP COLUMN "status",
ADD COLUMN     "status" "Status",
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_job_log" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL,
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_logininfor" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL,
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL DEFAULT '0',
ALTER COLUMN "login_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_menu" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL,
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL DEFAULT '0';

-- AlterTable
ALTER TABLE "sys_notice" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT '0',
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL DEFAULT '0';

-- AlterTable
ALTER TABLE "sys_oper_log" ALTER COLUMN "oper_time" SET DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL;

-- AlterTable
ALTER TABLE "sys_post" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT '0',
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL DEFAULT '0';

-- AlterTable
ALTER TABLE "sys_role" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT '0',
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL DEFAULT '0',
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_system_config" ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT '0',
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL DEFAULT '0';

-- AlterTable
ALTER TABLE "sys_tenant" ADD COLUMN     "is_direct" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "region_code" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT '0',
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL DEFAULT '0',
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_tenant_package" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT '0',
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL DEFAULT '0',
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_upload" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT '0',
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL DEFAULT '0',
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sys_user" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT '0',
DROP COLUMN "del_flag",
ADD COLUMN     "del_flag" "DelFlag" NOT NULL DEFAULT '0',
ALTER COLUMN "create_time" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "update_time" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "pms_category" (
    "cat_id" SERIAL NOT NULL,
    "parent_id" INTEGER,
    "name" VARCHAR(50) NOT NULL,
    "level" INTEGER NOT NULL,
    "icon" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "bind_type" "ProductType",
    "attr_template_id" INTEGER,

    CONSTRAINT "pms_category_pkey" PRIMARY KEY ("cat_id")
);

-- CreateTable
CREATE TABLE "pms_brand" (
    "brand_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,

    CONSTRAINT "pms_brand_pkey" PRIMARY KEY ("brand_id")
);

-- CreateTable
CREATE TABLE "pms_attr_template" (
    "template_id" SERIAL NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pms_attr_template_pkey" PRIMARY KEY ("template_id")
);

-- CreateTable
CREATE TABLE "pms_attribute" (
    "attr_id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "usage_type" "AttrUsageType" NOT NULL,
    "apply_type" INTEGER NOT NULL DEFAULT 0,
    "input_type" INTEGER NOT NULL DEFAULT 0,
    "input_list" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pms_attribute_pkey" PRIMARY KEY ("attr_id")
);

-- CreateTable
CREATE TABLE "pms_product_attr_value" (
    "id" SERIAL NOT NULL,
    "product_id" TEXT NOT NULL,
    "attr_id" INTEGER NOT NULL,
    "attr_name" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "pms_product_attr_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pms_product" (
    "product_id" TEXT NOT NULL,
    "cat_id" INTEGER NOT NULL,
    "brand_id" INTEGER,
    "name" VARCHAR(100) NOT NULL,
    "sub_title" TEXT,
    "main_images" TEXT[],
    "detail_html" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "weight" INTEGER,
    "is_free_ship" BOOLEAN NOT NULL DEFAULT false,
    "service_duration" INTEGER,
    "service_radius" INTEGER,
    "need_booking" BOOLEAN NOT NULL DEFAULT true,
    "spec_def" JSONB NOT NULL,
    "publish_status" "PublishStatus" NOT NULL DEFAULT 'ON_SHELF',
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pms_product_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "pms_global_sku" (
    "sku_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "spec_values" JSONB NOT NULL,
    "sku_image" TEXT,
    "guide_price" DECIMAL(10,2) NOT NULL,
    "dist_mode" "DistributionMode" NOT NULL DEFAULT 'RATIO',
    "guide_rate" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "min_dist_rate" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "max_dist_rate" DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    "cost_price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "pms_global_sku_pkey" PRIMARY KEY ("sku_id")
);

-- CreateTable
CREATE TABLE "pms_tenant_product" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'OFF_SHELF',
    "isHot" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "custom_title" TEXT,
    "override_radius" INTEGER,
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pms_tenant_product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pms_tenant_sku" (
    "id" TEXT NOT NULL,
    "tenant_prod_id" TEXT NOT NULL,
    "global_sku_id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dist_mode" "DistributionMode" NOT NULL DEFAULT 'RATIO',
    "dist_rate" DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "pms_tenant_sku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ums_member" (
    "member_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL DEFAULT '000000',
    "nickname" VARCHAR(64),
    "avatar" VARCHAR(500),
    "mobile" VARCHAR(20),
    "password" VARCHAR(200),
    "status" "MemberStatus" NOT NULL DEFAULT '1',
    "level_id" INTEGER,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "frozenBalance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "points" INTEGER NOT NULL DEFAULT 0,
    "referrer_id" TEXT,
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ums_member_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "sys_social_user" (
    "social_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "openid" VARCHAR(64) NOT NULL,
    "unionid" VARCHAR(64),
    "nickname" TEXT,
    "avatar" TEXT,
    "session_key" TEXT,

    CONSTRAINT "sys_social_user_pkey" PRIMARY KEY ("social_id")
);

-- CreateTable
CREATE TABLE "srv_worker" (
    "worker_id" SERIAL NOT NULL,
    "member_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "nick_name" TEXT,
    "avatar" VARCHAR(500),
    "phone" VARCHAR(20) NOT NULL,
    "status" "WorkerStatus" NOT NULL DEFAULT '1',
    "audit_status" "AuditStatus" NOT NULL DEFAULT '0',
    "is_online" BOOLEAN NOT NULL DEFAULT true,
    "current_lat" DOUBLE PRECISION,
    "current_lng" DOUBLE PRECISION,
    "service_radius" INTEGER NOT NULL DEFAULT 5000,
    "wage_type" "WageType" NOT NULL DEFAULT '1',
    "base_wage" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "rating" DECIMAL(2,1) NOT NULL DEFAULT 5.0,
    "order_count" INTEGER NOT NULL DEFAULT 0,
    "seniority" "WorkerLevel" NOT NULL DEFAULT '1',
    "tags" JSONB,
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "srv_worker_pkey" PRIMARY KEY ("worker_id")
);

-- CreateTable
CREATE TABLE "srv_worker_profile" (
    "profile_id" SERIAL NOT NULL,
    "worker_id" INTEGER NOT NULL,
    "id_card" VARCHAR(20),
    "id_card_front" VARCHAR(500),
    "id_card_back" VARCHAR(500),
    "gender" "Gender" NOT NULL DEFAULT '0',
    "age" INTEGER,
    "native_place" TEXT,
    "education" VARCHAR(20),
    "start_work_year" INTEGER,
    "height" INTEGER,
    "weight" INTEGER,
    "health_info" TEXT,
    "intro" TEXT,
    "voice_intro" TEXT,
    "video_intro" TEXT,
    "bank_name" TEXT,
    "bank_no" TEXT,

    CONSTRAINT "srv_worker_profile_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "srv_worker_cert" (
    "cert_id" SERIAL NOT NULL,
    "worker_id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "cert_no" TEXT,
    "images" JSONB,
    "issue_date" TIMESTAMP(3),
    "expire_date" TIMESTAMP(3),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "srv_worker_cert_pkey" PRIMARY KEY ("cert_id")
);

-- CreateTable
CREATE TABLE "srv_worker_skill" (
    "id" SERIAL NOT NULL,
    "worker_id" INTEGER NOT NULL,
    "cat_id" INTEGER NOT NULL,
    "skill_name" TEXT NOT NULL,
    "level" "SkillLevel" NOT NULL DEFAULT '1',

    CONSTRAINT "srv_worker_skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "srv_worker_work" (
    "work_id" SERIAL NOT NULL,
    "worker_id" INTEGER NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "mediaType" "MediaType" NOT NULL DEFAULT '1',
    "mediaUrls" JSONB NOT NULL,
    "work_date" TIMESTAMP(3),

    CONSTRAINT "srv_worker_work_pkey" PRIMARY KEY ("work_id")
);

-- CreateTable
CREATE TABLE "srv_worker_schedule" (
    "id" BIGSERIAL NOT NULL,
    "worker_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "busy_slots" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "srv_worker_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_tenant_geo" (
    "id" SERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "service_radius" INTEGER NOT NULL DEFAULT 3000,
    "geo_fence" JSONB,

    CONSTRAINT "sys_tenant_geo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_region_agent" (
    "agent_id" SERIAL NOT NULL,
    "region_code" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "member_id" TEXT,
    "level" INTEGER NOT NULL DEFAULT 3,
    "rate" DECIMAL(5,4) NOT NULL,
    "settleType" "SettleType" NOT NULL DEFAULT 'BANK',
    "bank_name" TEXT,
    "account_name" TEXT,
    "account_no" TEXT,
    "total_income" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "pending_settle" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "already_settle" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "createTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sys_region_agent_pkey" PRIMARY KEY ("agent_id")
);

-- CreateTable
CREATE TABLE "sys_region" (
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "parent_id" VARCHAR(20),
    "level" INTEGER NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "sys_region_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "sys_station" (
    "station_id" SERIAL NOT NULL,
    "tenant_id" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "address" VARCHAR(500),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "Status" NOT NULL DEFAULT '0',
    "create_by" VARCHAR(64) NOT NULL DEFAULT '',
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(64) NOT NULL DEFAULT '',
    "update_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sys_station_pkey" PRIMARY KEY ("station_id")
);

-- CreateTable
CREATE TABLE "sys_geo_fence" (
    "fence_id" SERIAL NOT NULL,
    "station_id" INTEGER NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'SERVICE',
    "geom" geometry,
    "config" JSONB,

    CONSTRAINT "sys_geo_fence_pkey" PRIMARY KEY ("fence_id")
);

-- CreateIndex
CREATE INDEX "pms_product_attr_value_product_id_idx" ON "pms_product_attr_value"("product_id");

-- CreateIndex
CREATE INDEX "pms_product_cat_id_idx" ON "pms_product"("cat_id");

-- CreateIndex
CREATE UNIQUE INDEX "pms_tenant_product_tenant_id_product_id_key" ON "pms_tenant_product"("tenant_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "ums_member_mobile_key" ON "ums_member"("mobile");

-- CreateIndex
CREATE INDEX "ums_member_mobile_idx" ON "ums_member"("mobile");

-- CreateIndex
CREATE INDEX "ums_member_referrer_id_idx" ON "ums_member"("referrer_id");

-- CreateIndex
CREATE INDEX "sys_social_user_member_id_idx" ON "sys_social_user"("member_id");

-- CreateIndex
CREATE INDEX "sys_social_user_unionid_idx" ON "sys_social_user"("unionid");

-- CreateIndex
CREATE UNIQUE INDEX "sys_social_user_platform_openid_key" ON "sys_social_user"("platform", "openid");

-- CreateIndex
CREATE UNIQUE INDEX "srv_worker_member_id_key" ON "srv_worker"("member_id");

-- CreateIndex
CREATE INDEX "srv_worker_tenant_id_status_idx" ON "srv_worker"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "srv_worker_phone_idx" ON "srv_worker"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "srv_worker_profile_worker_id_key" ON "srv_worker_profile"("worker_id");

-- CreateIndex
CREATE INDEX "srv_worker_cert_worker_id_idx" ON "srv_worker_cert"("worker_id");

-- CreateIndex
CREATE UNIQUE INDEX "srv_worker_skill_worker_id_cat_id_key" ON "srv_worker_skill"("worker_id", "cat_id");

-- CreateIndex
CREATE INDEX "srv_worker_work_worker_id_idx" ON "srv_worker_work"("worker_id");

-- CreateIndex
CREATE UNIQUE INDEX "srv_worker_schedule_worker_id_date_key" ON "srv_worker_schedule"("worker_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "sys_tenant_geo_tenant_id_key" ON "sys_tenant_geo"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sys_region_agent_region_code_key" ON "sys_region_agent"("region_code");

-- CreateIndex
CREATE INDEX "sys_region_parent_id_idx" ON "sys_region"("parent_id");

-- CreateIndex
CREATE INDEX "sys_station_tenant_id_idx" ON "sys_station"("tenant_id");

-- CreateIndex
CREATE INDEX "sys_geo_fence_station_id_idx" ON "sys_geo_fence"("station_id");

-- CreateIndex
CREATE INDEX "gen_table_del_flag_idx" ON "gen_table"("del_flag");

-- CreateIndex
CREATE INDEX "gen_table_column_del_flag_idx" ON "gen_table_column"("del_flag");

-- CreateIndex
CREATE INDEX "sys_client_del_flag_idx" ON "sys_client"("del_flag");

-- CreateIndex
CREATE INDEX "sys_config_tenant_id_status_idx" ON "sys_config"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sys_config_tenant_id_del_flag_status_idx" ON "sys_config"("tenant_id", "del_flag", "status");

-- CreateIndex
CREATE INDEX "sys_config_del_flag_idx" ON "sys_config"("del_flag");

-- CreateIndex
CREATE INDEX "sys_dept_tenant_id_status_idx" ON "sys_dept"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sys_dept_status_idx" ON "sys_dept"("status");

-- CreateIndex
CREATE INDEX "sys_dept_tenant_id_del_flag_status_idx" ON "sys_dept"("tenant_id", "del_flag", "status");

-- CreateIndex
CREATE INDEX "sys_dept_del_flag_idx" ON "sys_dept"("del_flag");

-- CreateIndex
CREATE INDEX "sys_dict_data_tenant_id_dict_type_status_idx" ON "sys_dict_data"("tenant_id", "dict_type", "status");

-- CreateIndex
CREATE INDEX "sys_dict_data_del_flag_idx" ON "sys_dict_data"("del_flag");

-- CreateIndex
CREATE INDEX "sys_dict_type_tenant_id_status_idx" ON "sys_dict_type"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sys_dict_type_del_flag_idx" ON "sys_dict_type"("del_flag");

-- CreateIndex
CREATE INDEX "sys_file_folder_del_flag_idx" ON "sys_file_folder"("del_flag");

-- CreateIndex
CREATE INDEX "sys_job_tenant_id_status_idx" ON "sys_job"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sys_logininfor_status_idx" ON "sys_logininfor"("status");

-- CreateIndex
CREATE INDEX "sys_logininfor_tenant_id_status_login_time_idx" ON "sys_logininfor"("tenant_id", "status", "login_time");

-- CreateIndex
CREATE INDEX "sys_logininfor_del_flag_idx" ON "sys_logininfor"("del_flag");

-- CreateIndex
CREATE INDEX "sys_menu_tenant_id_status_idx" ON "sys_menu"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sys_menu_status_idx" ON "sys_menu"("status");

-- CreateIndex
CREATE INDEX "sys_menu_tenant_id_del_flag_status_idx" ON "sys_menu"("tenant_id", "del_flag", "status");

-- CreateIndex
CREATE INDEX "sys_menu_del_flag_idx" ON "sys_menu"("del_flag");

-- CreateIndex
CREATE INDEX "sys_notice_tenant_id_status_idx" ON "sys_notice"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sys_notice_tenant_id_del_flag_status_idx" ON "sys_notice"("tenant_id", "del_flag", "status");

-- CreateIndex
CREATE INDEX "sys_notice_del_flag_idx" ON "sys_notice"("del_flag");

-- CreateIndex
CREATE INDEX "sys_oper_log_status_idx" ON "sys_oper_log"("status");

-- CreateIndex
CREATE INDEX "sys_oper_log_tenant_id_status_oper_time_idx" ON "sys_oper_log"("tenant_id", "status", "oper_time");

-- CreateIndex
CREATE INDEX "sys_post_tenant_id_status_idx" ON "sys_post"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sys_post_tenant_id_del_flag_status_idx" ON "sys_post"("tenant_id", "del_flag", "status");

-- CreateIndex
CREATE INDEX "sys_post_del_flag_idx" ON "sys_post"("del_flag");

-- CreateIndex
CREATE INDEX "sys_role_tenant_id_status_idx" ON "sys_role"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sys_role_tenant_id_del_flag_status_idx" ON "sys_role"("tenant_id", "del_flag", "status");

-- CreateIndex
CREATE INDEX "sys_role_del_flag_idx" ON "sys_role"("del_flag");

-- CreateIndex
CREATE INDEX "sys_system_config_status_idx" ON "sys_system_config"("status");

-- CreateIndex
CREATE INDEX "sys_system_config_del_flag_status_idx" ON "sys_system_config"("del_flag", "status");

-- CreateIndex
CREATE INDEX "sys_system_config_del_flag_idx" ON "sys_system_config"("del_flag");

-- CreateIndex
CREATE INDEX "sys_tenant_del_flag_idx" ON "sys_tenant"("del_flag");

-- CreateIndex
CREATE INDEX "sys_tenant_package_del_flag_idx" ON "sys_tenant_package"("del_flag");

-- CreateIndex
CREATE INDEX "sys_upload_file_md5_del_flag_idx" ON "sys_upload"("file_md5", "del_flag");

-- CreateIndex
CREATE INDEX "sys_upload_del_flag_idx" ON "sys_upload"("del_flag");

-- CreateIndex
CREATE INDEX "sys_user_tenant_id_status_idx" ON "sys_user"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sys_user_tenant_id_del_flag_status_idx" ON "sys_user"("tenant_id", "del_flag", "status");

-- CreateIndex
CREATE INDEX "sys_user_status_idx" ON "sys_user"("status");

-- CreateIndex
CREATE INDEX "sys_user_del_flag_idx" ON "sys_user"("del_flag");

-- AddForeignKey
ALTER TABLE "pms_category" ADD CONSTRAINT "pms_category_attr_template_id_fkey" FOREIGN KEY ("attr_template_id") REFERENCES "pms_attr_template"("template_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms_category" ADD CONSTRAINT "pms_category_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "pms_category"("cat_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms_attribute" ADD CONSTRAINT "pms_attribute_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "pms_attr_template"("template_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms_product_attr_value" ADD CONSTRAINT "pms_product_attr_value_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "pms_product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms_product_attr_value" ADD CONSTRAINT "pms_product_attr_value_attr_id_fkey" FOREIGN KEY ("attr_id") REFERENCES "pms_attribute"("attr_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms_product" ADD CONSTRAINT "pms_product_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "pms_category"("cat_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms_product" ADD CONSTRAINT "pms_product_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "pms_brand"("brand_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms_global_sku" ADD CONSTRAINT "pms_global_sku_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "pms_product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms_tenant_product" ADD CONSTRAINT "pms_tenant_product_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "pms_product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms_tenant_sku" ADD CONSTRAINT "pms_tenant_sku_global_sku_id_fkey" FOREIGN KEY ("global_sku_id") REFERENCES "pms_global_sku"("sku_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms_tenant_sku" ADD CONSTRAINT "pms_tenant_sku_tenant_prod_id_fkey" FOREIGN KEY ("tenant_prod_id") REFERENCES "pms_tenant_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ums_member" ADD CONSTRAINT "ums_member_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "ums_member"("member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_social_user" ADD CONSTRAINT "sys_social_user_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "ums_member"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srv_worker" ADD CONSTRAINT "srv_worker_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "ums_member"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srv_worker_profile" ADD CONSTRAINT "srv_worker_profile_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "srv_worker"("worker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srv_worker_cert" ADD CONSTRAINT "srv_worker_cert_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "srv_worker"("worker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srv_worker_skill" ADD CONSTRAINT "srv_worker_skill_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "srv_worker"("worker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srv_worker_work" ADD CONSTRAINT "srv_worker_work_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "srv_worker"("worker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srv_worker_schedule" ADD CONSTRAINT "srv_worker_schedule_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "srv_worker"("worker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_tenant_geo" ADD CONSTRAINT "sys_tenant_geo_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "sys_tenant"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_region_agent" ADD CONSTRAINT "sys_region_agent_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "ums_member"("member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_region" ADD CONSTRAINT "sys_region_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "sys_region"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_geo_fence" ADD CONSTRAINT "sys_geo_fence_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "sys_station"("station_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_user" ADD CONSTRAINT "sys_user_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "sys_dept"("dept_id") ON DELETE SET NULL ON UPDATE CASCADE;
