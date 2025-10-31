-- AlterTable
ALTER TABLE "message_groups" ADD COLUMN     "users_can_delete_own_messages" BOOLEAN NOT NULL DEFAULT true;
