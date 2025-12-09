-- Add Stripe billing fields to users table (were missing from initial migration)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_customer_id" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "default_payment_method_id" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "renewal_date" TIMESTAMP(6);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "additional_storage_packs" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_billing_attempt" TIMESTAMP(6);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "billing_failure_count" INTEGER NOT NULL DEFAULT 0;

-- Create unique index on stripe_customer_id if not exists
CREATE UNIQUE INDEX IF NOT EXISTS "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- Create index on renewal_date if not exists
CREATE INDEX IF NOT EXISTS "users_renewal_date_idx" ON "users"("renewal_date");

-- Add support and account status fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_support_user" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_locked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_at" TIMESTAMP(6);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_reason" VARCHAR(500);

-- CreateIndex for support user
CREATE INDEX IF NOT EXISTS "users_is_support_user_idx" ON "users"("is_support_user");

-- CreateTable for support audit logs
CREATE TABLE IF NOT EXISTS "support_audit_logs" (
    "log_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performed_by_id" UUID NOT NULL,
    "performed_by_email" VARCHAR(255) NOT NULL,
    "target_user_id" UUID NOT NULL,
    "target_user_email" VARCHAR(255) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "details" TEXT,
    "previous_value" TEXT,
    "new_value" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),

    CONSTRAINT "support_audit_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex for support audit logs
CREATE INDEX IF NOT EXISTS "support_audit_logs_target_user_id_idx" ON "support_audit_logs"("target_user_id");
CREATE INDEX IF NOT EXISTS "support_audit_logs_performed_by_id_idx" ON "support_audit_logs"("performed_by_id");
CREATE INDEX IF NOT EXISTS "support_audit_logs_action_idx" ON "support_audit_logs"("action");
CREATE INDEX IF NOT EXISTS "support_audit_logs_created_at_idx" ON "support_audit_logs"("created_at");

-- AddForeignKey (only if not exists - using DO block for conditional)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_audit_logs_performed_by_id_fkey') THEN
        ALTER TABLE "support_audit_logs" ADD CONSTRAINT "support_audit_logs_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_audit_logs_target_user_id_fkey') THEN
        ALTER TABLE "support_audit_logs" ADD CONSTRAINT "support_audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
