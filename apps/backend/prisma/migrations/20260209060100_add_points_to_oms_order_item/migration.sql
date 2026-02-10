-- AlterTable: 为 oms_order_item 添加积分相关字段（与 schema 一致）
-- points_ratio: 下单时积分比例快照
-- earned_points: 该商品产生的积分

ALTER TABLE "oms_order_item" ADD COLUMN "points_ratio" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "oms_order_item" ADD COLUMN "earned_points" INTEGER NOT NULL DEFAULT 0;
