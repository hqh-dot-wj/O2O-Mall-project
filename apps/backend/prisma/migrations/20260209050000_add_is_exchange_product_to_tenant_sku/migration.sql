-- AlterTable: 为 pms_tenant_sku 添加 is_exchange_product 字段
-- 用途: 标识兑换商品（优惠券/积分全额兑换，不参与分佣）

ALTER TABLE "pms_tenant_sku" ADD COLUMN "is_exchange_product" BOOLEAN NOT NULL DEFAULT false;
