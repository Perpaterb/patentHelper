/*
  Warnings:

  - You are about to drop the column `background_image_url` on the `groups` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "groups" DROP COLUMN "background_image_url",
ADD COLUMN     "background_image_id" UUID;
