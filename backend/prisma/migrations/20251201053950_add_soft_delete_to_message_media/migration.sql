-- AlterTable
ALTER TABLE "message_media" ADD COLUMN     "hidden_at" TIMESTAMP(6),
ADD COLUMN     "hidden_by" UUID,
ADD COLUMN     "is_hidden" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "message_media" ADD CONSTRAINT "message_media_hidden_by_fkey" FOREIGN KEY ("hidden_by") REFERENCES "group_members"("group_member_id") ON DELETE SET NULL ON UPDATE CASCADE;
