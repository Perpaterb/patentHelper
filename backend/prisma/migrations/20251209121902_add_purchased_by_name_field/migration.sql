-- AlterTable
ALTER TABLE "gift_items" ADD COLUMN     "purchased_by_name" VARCHAR(255);

-- AlterTable
ALTER TABLE "personal_gift_items" ADD COLUMN     "purchased_by_name" VARCHAR(255);

-- CreateTable
CREATE TABLE "billing_history" (
    "billing_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "stripe_payment_intent_id" VARCHAR(255),
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'aud',
    "status" VARCHAR(20) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "base_subscription_amount" INTEGER NOT NULL,
    "storage_packs" INTEGER NOT NULL DEFAULT 0,
    "storage_pack_amount" INTEGER NOT NULL DEFAULT 0,
    "period_start" TIMESTAMP(6) NOT NULL,
    "period_end" TIMESTAMP(6) NOT NULL,
    "failure_reason" VARCHAR(500),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_history_pkey" PRIMARY KEY ("billing_id")
);

-- CreateIndex
CREATE INDEX "billing_history_user_id_idx" ON "billing_history"("user_id");

-- CreateIndex
CREATE INDEX "billing_history_status_idx" ON "billing_history"("status");

-- CreateIndex
CREATE INDEX "billing_history_created_at_idx" ON "billing_history"("created_at");

-- AddForeignKey
ALTER TABLE "billing_history" ADD CONSTRAINT "billing_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
