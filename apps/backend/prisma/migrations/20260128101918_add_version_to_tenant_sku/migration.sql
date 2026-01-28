-- AlterTable: 为 pms_tenant_sku 添加 version 字段用于乐观锁
-- 用途: 防止商品价格/库存并发更新冲突

ALTER TABLE "pms_tenant_sku" ADD COLUMN "version" INT NOT NULL DEFAULT 0;

-- 为 version 字段创建索引,优化乐观锁查询性能
CREATE INDEX "idx_tenant_sku_version" ON "pms_tenant_sku"("id", "version");
