-- CreateTable
CREATE TABLE "pms_stock_log" (
    "id" TEXT NOT NULL,
    "tenant_id" VARCHAR(20) NOT NULL,
    "tenant_sku_id" VARCHAR(36) NOT NULL,
    "operator_id" VARCHAR(64) NOT NULL,
    "stock_change" INTEGER NOT NULL,
    "stock_before" INTEGER NOT NULL,
    "stock_after" INTEGER NOT NULL,
    "reason" VARCHAR(200),
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pms_stock_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pms_stock_log_tenant_id_create_time_idx" ON "pms_stock_log"("tenant_id", "create_time");

-- CreateIndex
CREATE INDEX "pms_stock_log_tenant_sku_id_idx" ON "pms_stock_log"("tenant_sku_id");
