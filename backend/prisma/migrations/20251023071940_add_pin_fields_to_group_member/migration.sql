-- AlterTable
ALTER TABLE "group_members" ADD COLUMN     "is_pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinned_order" INTEGER;
