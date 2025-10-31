-- AlterTable
ALTER TABLE "finance_matters" ADD COLUMN     "canceled_at" TIMESTAMP(6),
ADD COLUMN     "canceled_by" UUID,
ADD COLUMN     "is_canceled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "finance_matters_is_canceled_idx" ON "finance_matters"("is_canceled");

-- AddForeignKey
ALTER TABLE "finance_matters" ADD CONSTRAINT "finance_matters_canceled_by_fkey" FOREIGN KEY ("canceled_by") REFERENCES "group_members"("group_member_id") ON DELETE SET NULL ON UPDATE CASCADE;
