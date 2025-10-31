-- CreateTable
CREATE TABLE "finance_matter_messages" (
    "message_id" UUID NOT NULL,
    "finance_matter_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "finance_matter_messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateIndex
CREATE INDEX "finance_matter_messages_finance_matter_id_idx" ON "finance_matter_messages"("finance_matter_id");

-- CreateIndex
CREATE INDEX "finance_matter_messages_sender_id_idx" ON "finance_matter_messages"("sender_id");

-- CreateIndex
CREATE INDEX "finance_matter_messages_created_at_idx" ON "finance_matter_messages"("created_at");

-- AddForeignKey
ALTER TABLE "finance_matter_messages" ADD CONSTRAINT "finance_matter_messages_finance_matter_id_fkey" FOREIGN KEY ("finance_matter_id") REFERENCES "finance_matters"("finance_matter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_matter_messages" ADD CONSTRAINT "finance_matter_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;
