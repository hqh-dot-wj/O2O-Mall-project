-- AlterTable: 为优惠券模板表添加最低实付金额字段（与 Prisma schema 一致）
ALTER TABLE "mkt_coupon_template" ADD COLUMN IF NOT EXISTS "min_actual_pay_amount" DECIMAL(10,2) NULL;
