-- AlterTable: 为 pms_tenant_sku 添加 points_ratio、is_promotion_product 字段
-- points_ratio: 积分获得比例（0-100，默认100）
-- is_promotion_product: 是否营销活动商品

ALTER TABLE "pms_tenant_sku" ADD COLUMN "points_ratio" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "pms_tenant_sku" ADD COLUMN "is_promotion_product" BOOLEAN NOT NULL DEFAULT false;
