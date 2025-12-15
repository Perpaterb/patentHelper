/*
  Warnings:

  - You are about to drop the `device_tokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "device_tokens" DROP CONSTRAINT "device_tokens_user_id_fkey";

-- AlterTable
ALTER TABLE "calendar_events" ADD COLUMN     "notification_minutes" INTEGER DEFAULT 15;

-- DropTable
DROP TABLE "device_tokens";
