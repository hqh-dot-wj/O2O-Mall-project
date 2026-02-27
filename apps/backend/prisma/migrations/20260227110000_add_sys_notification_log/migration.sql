-- CreateTable
CREATE TABLE "sys_notification_log" (
    "id" SERIAL NOT NULL,
    "tenant_id" VARCHAR(20) NOT NULL,
    "channel" VARCHAR(30) NOT NULL,
    "target" VARCHAR(100) NOT NULL,
    "template" VARCHAR(50),
    "title" VARCHAR(200),
    "content" TEXT,
    "status" VARCHAR(20) NOT NULL,
    "error_msg" VARCHAR(500),
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sys_notification_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sys_notification_log_tenant_id_idx" ON "sys_notification_log"("tenant_id");

-- CreateIndex
CREATE INDEX "sys_notification_log_create_time_idx" ON "sys_notification_log"("create_time");
