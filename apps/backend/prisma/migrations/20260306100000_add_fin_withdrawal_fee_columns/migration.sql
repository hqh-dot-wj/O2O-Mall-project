-- AlterTable
ALTER TABLE "fin_withdrawal" ADD COLUMN "fee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "fin_withdrawal" ADD COLUMN "actual_amount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "fin_withdrawal" ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0;
