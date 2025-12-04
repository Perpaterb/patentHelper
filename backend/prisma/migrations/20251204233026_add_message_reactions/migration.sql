-- CreateTable
CREATE TABLE "message_reactions" (
    "reaction_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "reactor_id" UUID NOT NULL,
    "emoji" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("reaction_id")
);

-- CreateIndex
CREATE INDEX "message_reactions_message_id_idx" ON "message_reactions"("message_id");

-- CreateIndex
CREATE INDEX "message_reactions_reactor_id_idx" ON "message_reactions"("reactor_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_reactions_message_id_reactor_id_emoji_key" ON "message_reactions"("message_id", "reactor_id", "emoji");

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("message_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_reactor_id_fkey" FOREIGN KEY ("reactor_id") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;
