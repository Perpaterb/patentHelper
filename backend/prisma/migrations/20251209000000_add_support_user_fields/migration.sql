-- AlterTable
ALTER TABLE "users" ADD COLUMN "is_support_user" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "is_locked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "locked_at" TIMESTAMP(6);
ALTER TABLE "users" ADD COLUMN "locked_reason" VARCHAR(500);

-- CreateIndex
CREATE INDEX "users_is_support_user_idx" ON "users"("is_support_user");

-- CreateTable
CREATE TABLE "support_audit_logs" (
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

-- CreateIndex
CREATE INDEX "support_audit_logs_target_user_id_idx" ON "support_audit_logs"("target_user_id");

-- CreateIndex
CREATE INDEX "support_audit_logs_performed_by_id_idx" ON "support_audit_logs"("performed_by_id");

-- CreateIndex
CREATE INDEX "support_audit_logs_action_idx" ON "support_audit_logs"("action");

-- CreateIndex
CREATE INDEX "support_audit_logs_created_at_idx" ON "support_audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "support_audit_logs" ADD CONSTRAINT "support_audit_logs_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_audit_logs" ADD CONSTRAINT "support_audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
