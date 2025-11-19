-- AlterTable
ALTER TABLE "gift_items" ADD COLUMN     "is_purchased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "purchased_at" TIMESTAMP(6),
ADD COLUMN     "purchased_by" UUID;

-- AlterTable
ALTER TABLE "personal_gift_items" ADD COLUMN     "is_purchased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "purchased_at" TIMESTAMP(6),
ADD COLUMN     "purchased_by" UUID;

-- CreateIndex
CREATE INDEX "gift_items_purchased_by_idx" ON "gift_items"("purchased_by");

-- CreateIndex
CREATE INDEX "personal_gift_items_purchased_by_idx" ON "personal_gift_items"("purchased_by");

-- AddForeignKey
ALTER TABLE "gift_items" ADD CONSTRAINT "gift_items_purchased_by_fkey" FOREIGN KEY ("purchased_by") REFERENCES "group_members"("group_member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_gift_items" ADD CONSTRAINT "personal_gift_items_purchased_by_fkey" FOREIGN KEY ("purchased_by") REFERENCES "group_members"("group_member_id") ON DELETE SET NULL ON UPDATE CASCADE;
