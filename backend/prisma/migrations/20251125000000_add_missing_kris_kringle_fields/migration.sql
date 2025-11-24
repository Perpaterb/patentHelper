-- Add missing fields to kris_kringles table that exist in Prisma schema but not in database

-- Add occasion field
ALTER TABLE "kris_kringles" ADD COLUMN IF NOT EXISTS "occasion" VARCHAR(255);

-- Add web_token field (for public sharing)
ALTER TABLE "kris_kringles" ADD COLUMN IF NOT EXISTS "web_token" VARCHAR(64);

-- Add assigning_date_time field (renamed from reveal_date)
ALTER TABLE "kris_kringles" ADD COLUMN IF NOT EXISTS "assigning_date_time" TIMESTAMP(6);

-- Add is_assigned field
ALTER TABLE "kris_kringles" ADD COLUMN IF NOT EXISTS "is_assigned" BOOLEAN NOT NULL DEFAULT false;

-- Drop reveal_date if it exists (renamed to assigning_date_time)
ALTER TABLE "kris_kringles" DROP COLUMN IF EXISTS "reveal_date";

-- Add missing fields to kris_kringle_participants table
ALTER TABLE "kris_kringle_participants" ADD COLUMN IF NOT EXISTS "passcode" VARCHAR(6);
ALTER TABLE "kris_kringle_participants" ADD COLUMN IF NOT EXISTS "has_viewed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "kris_kringle_participants" ADD COLUMN IF NOT EXISTS "viewed_at" TIMESTAMP(6);
ALTER TABLE "kris_kringle_participants" ADD COLUMN IF NOT EXISTS "gift_registry_id" UUID;
ALTER TABLE "kris_kringle_participants" ADD COLUMN IF NOT EXISTS "initial_email_sent_at" TIMESTAMP(6);
ALTER TABLE "kris_kringle_participants" ADD COLUMN IF NOT EXISTS "assignment_email_sent_at" TIMESTAMP(6);

-- Make email nullable (participants can be added without email initially)
ALTER TABLE "kris_kringle_participants" ALTER COLUMN "email" DROP NOT NULL;

-- Create unique index on web_token
CREATE UNIQUE INDEX IF NOT EXISTS "kris_kringles_web_token_key" ON "kris_kringles"("web_token");

-- Create index on email for kris_kringle_participants
CREATE INDEX IF NOT EXISTS "kris_kringle_participants_email_idx" ON "kris_kringle_participants"("email");
