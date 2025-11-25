/*
  Warnings:

  - Made the column `email` on table `kris_kringle_participants` required. This step will fail if there are existing NULL values in that column.
  - Made the column `passcode` on table `kris_kringle_participants` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable: Change defaults for supervisor visibility (only affects new rows)
ALTER TABLE "group_settings" ALTER COLUMN "calendar_visible_to_supervisors" SET DEFAULT false,
ALTER COLUMN "gift_registry_visible_to_supervisors" SET DEFAULT false,
ALTER COLUMN "secret_santa_visible_to_supervisors" SET DEFAULT false,
ALTER COLUMN "item_registry_visible_to_supervisors" SET DEFAULT false,
ALTER COLUMN "wiki_visible_to_supervisors" SET DEFAULT false;

-- Update existing rows: Set supervisor visibility to false for all features except Message Groups
-- Message Groups stays true (supervisors can see messages but can't send)
-- Finance and Documents already have false defaults
UPDATE "group_settings"
SET
  "calendar_visible_to_supervisors" = false,
  "gift_registry_visible_to_supervisors" = false,
  "secret_santa_visible_to_supervisors" = false,
  "item_registry_visible_to_supervisors" = false,
  "wiki_visible_to_supervisors" = false;

-- AlterTable
ALTER TABLE "kris_kringle_participants" ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "passcode" SET NOT NULL;

-- CreateIndex
CREATE INDEX "kris_kringles_web_token_idx" ON "kris_kringles"("web_token");
