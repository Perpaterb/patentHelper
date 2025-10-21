-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "kinde_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_subscribed" BOOLEAN NOT NULL DEFAULT false,
    "subscription_id" VARCHAR(255),
    "subscription_start_date" TIMESTAMP(6),
    "subscription_end_date" TIMESTAMP(6),
    "storage_limit_gb" INTEGER NOT NULL DEFAULT 0,
    "storage_used_bytes" BIGINT NOT NULL DEFAULT 0,
    "last_login" TIMESTAMP(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "groups" (
    "group_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "icon" VARCHAR(255),
    "background_image_url" TEXT,
    "background_color" VARCHAR(7),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "date_format" VARCHAR(50) NOT NULL DEFAULT 'MM/DD/YYYY',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "created_by_trial_user" BOOLEAN NOT NULL DEFAULT false,
    "created_by_user_id" UUID,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("group_id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "group_member_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "user_id" UUID,
    "role" VARCHAR(50) NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "icon_letters" VARCHAR(3) NOT NULL,
    "icon_color" VARCHAR(7) NOT NULL,
    "email" VARCHAR(255),
    "is_registered" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "notify_requests" BOOLEAN NOT NULL DEFAULT true,
    "notify_all_messages" BOOLEAN NOT NULL DEFAULT true,
    "notify_mention_messages" BOOLEAN NOT NULL DEFAULT true,
    "notify_all_calendar" BOOLEAN NOT NULL DEFAULT true,
    "notify_mention_calendar" BOOLEAN NOT NULL DEFAULT true,
    "notify_all_finance" BOOLEAN NOT NULL DEFAULT true,
    "notify_mention_finance" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("group_member_id")
);

-- CreateTable
CREATE TABLE "relationships" (
    "relationship_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "member_id_1" UUID NOT NULL,
    "member_id_2" UUID NOT NULL,
    "relationship_type" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relationships_pkey" PRIMARY KEY ("relationship_id")
);

-- CreateTable
CREATE TABLE "group_settings" (
    "group_id" UUID NOT NULL,
    "parents_create_message_groups" BOOLEAN NOT NULL DEFAULT true,
    "children_create_message_groups" BOOLEAN NOT NULL DEFAULT false,
    "caregivers_create_message_groups" BOOLEAN NOT NULL DEFAULT true,
    "finance_visible_to_parents" BOOLEAN NOT NULL DEFAULT true,
    "finance_creatable_by_parents" BOOLEAN NOT NULL DEFAULT true,
    "finance_visible_to_caregivers" BOOLEAN NOT NULL DEFAULT false,
    "finance_creatable_by_caregivers" BOOLEAN NOT NULL DEFAULT false,
    "finance_visible_to_children" BOOLEAN NOT NULL DEFAULT false,
    "finance_creatable_by_children" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_settings_pkey" PRIMARY KEY ("group_id")
);

-- CreateTable
CREATE TABLE "admin_permissions" (
    "permission_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "granting_admin_id" UUID NOT NULL,
    "receiving_admin_id" UUID NOT NULL,
    "auto_approve_hide_messages" BOOLEAN NOT NULL DEFAULT false,
    "auto_approve_add_people" BOOLEAN NOT NULL DEFAULT false,
    "auto_approve_remove_people" BOOLEAN NOT NULL DEFAULT false,
    "auto_approve_assign_roles" BOOLEAN NOT NULL DEFAULT false,
    "auto_approve_change_roles" BOOLEAN NOT NULL DEFAULT false,
    "auto_approve_assign_relationships" BOOLEAN NOT NULL DEFAULT false,
    "auto_approve_change_relationships" BOOLEAN NOT NULL DEFAULT false,
    "auto_approve_calendar_entries" BOOLEAN NOT NULL DEFAULT false,
    "auto_approve_assign_children_to_events" BOOLEAN NOT NULL DEFAULT false,
    "auto_approve_assign_caregivers_to_events" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("permission_id")
);

-- CreateTable
CREATE TABLE "message_groups" (
    "message_group_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_at" TIMESTAMP(6),

    CONSTRAINT "message_groups_pkey" PRIMARY KEY ("message_group_id")
);

-- CreateTable
CREATE TABLE "message_group_members" (
    "message_group_id" UUID NOT NULL,
    "group_member_id" UUID NOT NULL,
    "joined_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "last_read_at" TIMESTAMP(6),

    CONSTRAINT "message_group_members_pkey" PRIMARY KEY ("message_group_id","group_member_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "message_id" UUID NOT NULL,
    "message_group_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" TIMESTAMP(6),
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "hidden_at" TIMESTAMP(6),
    "hidden_by" UUID,
    "sent_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "mentions" UUID[],

    CONSTRAINT "messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "message_media" (
    "media_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "media_type" VARCHAR(20) NOT NULL,
    "s3_key" VARCHAR(500) NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "file_size_bytes" BIGINT NOT NULL,
    "uploaded_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_media_pkey" PRIMARY KEY ("media_id")
);

-- CreateTable
CREATE TABLE "message_read_receipts" (
    "message_id" UUID NOT NULL,
    "group_member_id" UUID NOT NULL,
    "read_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_read_receipts_pkey" PRIMARY KEY ("message_id","group_member_id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "event_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "start_time" TIMESTAMP(6) NOT NULL,
    "end_time" TIMESTAMP(6) NOT NULL,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_pattern" VARCHAR(50),
    "recurrence_interval" INTEGER,
    "recurrence_end_date" TIMESTAMP(6),
    "parent_event_id" UUID,
    "is_responsibility_event" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "event_attendees" (
    "event_id" UUID NOT NULL,
    "group_member_id" UUID NOT NULL,

    CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("event_id","group_member_id")
);

-- CreateTable
CREATE TABLE "child_responsibility_events" (
    "responsibility_event_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "start_responsibility_type" VARCHAR(20) NOT NULL,
    "start_responsible_member_id" UUID,
    "start_responsible_other_name" VARCHAR(255),
    "start_responsible_other_icon_letters" VARCHAR(3),
    "start_responsible_other_color" VARCHAR(7),
    "end_responsibility_type" VARCHAR(20) NOT NULL,
    "end_responsible_member_id" UUID,
    "end_responsible_other_name" VARCHAR(255),
    "end_responsible_other_icon_letters" VARCHAR(3),
    "end_responsible_other_color" VARCHAR(7),

    CONSTRAINT "child_responsibility_events_pkey" PRIMARY KEY ("responsibility_event_id")
);

-- CreateTable
CREATE TABLE "finance_matters" (
    "finance_matter_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "due_date" TIMESTAMP(6),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_settled" BOOLEAN NOT NULL DEFAULT false,
    "settled_at" TIMESTAMP(6),
    "settled_by" UUID,

    CONSTRAINT "finance_matters_pkey" PRIMARY KEY ("finance_matter_id")
);

-- CreateTable
CREATE TABLE "finance_matter_members" (
    "finance_matter_id" UUID NOT NULL,
    "group_member_id" UUID NOT NULL,
    "expected_amount" DECIMAL(12,2) NOT NULL,
    "expected_percentage" DECIMAL(5,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "finance_matter_members_pkey" PRIMARY KEY ("finance_matter_id","group_member_id")
);

-- CreateTable
CREATE TABLE "finance_payments" (
    "payment_id" UUID NOT NULL,
    "finance_matter_id" UUID NOT NULL,
    "from_member_id" UUID NOT NULL,
    "to_member_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "receipt_image_url" TEXT,
    "reported_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(6),
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "finance_payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "approval_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "approval_type" VARCHAR(50) NOT NULL,
    "requested_by" UUID NOT NULL,
    "requested_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "completed_at" TIMESTAMP(6),
    "related_entity_type" VARCHAR(50),
    "related_entity_id" UUID,
    "approval_data" JSONB NOT NULL,
    "requires_all_admins" BOOLEAN NOT NULL DEFAULT false,
    "required_approval_percentage" DECIMAL(5,2) NOT NULL DEFAULT 50.00,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("approval_id")
);

-- CreateTable
CREATE TABLE "approval_votes" (
    "approval_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "vote" VARCHAR(10) NOT NULL,
    "voted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_votes_pkey" PRIMARY KEY ("approval_id","admin_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "log_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "action_location" VARCHAR(255),
    "performed_by" UUID,
    "performed_by_name" VARCHAR(255),
    "performed_by_email" VARCHAR(255),
    "performed_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message_content" TEXT,
    "media_links" TEXT[],
    "log_data" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "media_log_links" (
    "link_id" UUID NOT NULL,
    "log_export_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "access_token" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "accessed_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "media_log_links_pkey" PRIMARY KEY ("link_id")
);

-- CreateTable
CREATE TABLE "storage_usage" (
    "usage_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "media_type" VARCHAR(20) NOT NULL,
    "file_count" INTEGER NOT NULL DEFAULT 0,
    "total_bytes" BIGINT NOT NULL DEFAULT 0,
    "last_calculated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage_usage_pkey" PRIMARY KEY ("usage_id")
);

-- CreateTable
CREATE TABLE "pinned_items" (
    "pin_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "item_type" VARCHAR(50) NOT NULL,
    "item_id" UUID NOT NULL,
    "pinned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pin_order" INTEGER NOT NULL,

    CONSTRAINT "pinned_items_pkey" PRIMARY KEY ("pin_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_kinde_id_key" ON "users"("kinde_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_kinde_id_idx" ON "users"("kinde_id");

-- CreateIndex
CREATE INDEX "groups_created_at_idx" ON "groups"("created_at");

-- CreateIndex
CREATE INDEX "group_members_group_id_idx" ON "group_members"("group_id");

-- CreateIndex
CREATE INDEX "group_members_user_id_idx" ON "group_members"("user_id");

-- CreateIndex
CREATE INDEX "group_members_group_id_role_idx" ON "group_members"("group_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_user_id_key" ON "group_members"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "relationships_group_id_idx" ON "relationships"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "relationships_group_id_member_id_1_member_id_2_key" ON "relationships"("group_id", "member_id_1", "member_id_2");

-- CreateIndex
CREATE UNIQUE INDEX "admin_permissions_group_id_granting_admin_id_receiving_admi_key" ON "admin_permissions"("group_id", "granting_admin_id", "receiving_admin_id");

-- CreateIndex
CREATE INDEX "message_groups_group_id_idx" ON "message_groups"("group_id");

-- CreateIndex
CREATE INDEX "message_groups_last_message_at_idx" ON "message_groups"("last_message_at");

-- CreateIndex
CREATE INDEX "message_group_members_group_member_id_idx" ON "message_group_members"("group_member_id");

-- CreateIndex
CREATE INDEX "messages_message_group_id_created_at_idx" ON "messages"("message_group_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "message_media_message_id_idx" ON "message_media"("message_id");

-- CreateIndex
CREATE INDEX "message_read_receipts_group_member_id_idx" ON "message_read_receipts"("group_member_id");

-- CreateIndex
CREATE INDEX "calendar_events_group_id_idx" ON "calendar_events"("group_id");

-- CreateIndex
CREATE INDEX "calendar_events_start_time_end_time_idx" ON "calendar_events"("start_time", "end_time");

-- CreateIndex
CREATE INDEX "calendar_events_is_recurring_parent_event_id_idx" ON "calendar_events"("is_recurring", "parent_event_id");

-- CreateIndex
CREATE INDEX "event_attendees_group_member_id_idx" ON "event_attendees"("group_member_id");

-- CreateIndex
CREATE INDEX "child_responsibility_events_event_id_idx" ON "child_responsibility_events"("event_id");

-- CreateIndex
CREATE INDEX "child_responsibility_events_child_id_idx" ON "child_responsibility_events"("child_id");

-- CreateIndex
CREATE INDEX "finance_matters_group_id_idx" ON "finance_matters"("group_id");

-- CreateIndex
CREATE INDEX "finance_matters_is_settled_idx" ON "finance_matters"("is_settled");

-- CreateIndex
CREATE INDEX "finance_matter_members_group_member_id_idx" ON "finance_matter_members"("group_member_id");

-- CreateIndex
CREATE INDEX "finance_payments_finance_matter_id_idx" ON "finance_payments"("finance_matter_id");

-- CreateIndex
CREATE INDEX "finance_payments_from_member_id_to_member_id_idx" ON "finance_payments"("from_member_id", "to_member_id");

-- CreateIndex
CREATE INDEX "approvals_group_id_idx" ON "approvals"("group_id");

-- CreateIndex
CREATE INDEX "approvals_status_idx" ON "approvals"("status");

-- CreateIndex
CREATE INDEX "approvals_requested_by_idx" ON "approvals"("requested_by");

-- CreateIndex
CREATE INDEX "approval_votes_admin_id_idx" ON "approval_votes"("admin_id");

-- CreateIndex
CREATE INDEX "audit_logs_group_id_idx" ON "audit_logs"("group_id");

-- CreateIndex
CREATE INDEX "audit_logs_group_id_performed_at_idx" ON "audit_logs"("group_id", "performed_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_performed_by_idx" ON "audit_logs"("performed_by");

-- CreateIndex
CREATE INDEX "media_log_links_log_export_id_idx" ON "media_log_links"("log_export_id");

-- CreateIndex
CREATE INDEX "media_log_links_expires_at_idx" ON "media_log_links"("expires_at");

-- CreateIndex
CREATE INDEX "storage_usage_user_id_idx" ON "storage_usage"("user_id");

-- CreateIndex
CREATE INDEX "storage_usage_group_id_idx" ON "storage_usage"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "storage_usage_user_id_group_id_media_type_key" ON "storage_usage"("user_id", "group_id", "media_type");

-- CreateIndex
CREATE INDEX "pinned_items_user_id_item_type_pin_order_idx" ON "pinned_items"("user_id", "item_type", "pin_order");

-- CreateIndex
CREATE UNIQUE INDEX "pinned_items_user_id_item_type_item_id_key" ON "pinned_items"("user_id", "item_type", "item_id");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_member_id_1_fkey" FOREIGN KEY ("member_id_1") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_member_id_2_fkey" FOREIGN KEY ("member_id_2") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_settings" ADD CONSTRAINT "group_settings_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_granting_admin_id_fkey" FOREIGN KEY ("granting_admin_id") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_receiving_admin_id_fkey" FOREIGN KEY ("receiving_admin_id") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_groups" ADD CONSTRAINT "message_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_groups" ADD CONSTRAINT "message_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_group_members" ADD CONSTRAINT "message_group_members_message_group_id_fkey" FOREIGN KEY ("message_group_id") REFERENCES "message_groups"("message_group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_group_members" ADD CONSTRAINT "message_group_members_group_member_id_fkey" FOREIGN KEY ("group_member_id") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_message_group_id_fkey" FOREIGN KEY ("message_group_id") REFERENCES "message_groups"("message_group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_hidden_by_fkey" FOREIGN KEY ("hidden_by") REFERENCES "group_members"("group_member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_media" ADD CONSTRAINT "message_media_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("message_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_read_receipts" ADD CONSTRAINT "message_read_receipts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("message_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_read_receipts" ADD CONSTRAINT "message_read_receipts_group_member_id_fkey" FOREIGN KEY ("group_member_id") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_parent_event_id_fkey" FOREIGN KEY ("parent_event_id") REFERENCES "calendar_events"("event_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_group_member_id_fkey" FOREIGN KEY ("group_member_id") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_responsibility_events" ADD CONSTRAINT "child_responsibility_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_responsibility_events" ADD CONSTRAINT "child_responsibility_events_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_responsibility_events" ADD CONSTRAINT "child_responsibility_events_start_responsible_member_id_fkey" FOREIGN KEY ("start_responsible_member_id") REFERENCES "group_members"("group_member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_responsibility_events" ADD CONSTRAINT "child_responsibility_events_end_responsible_member_id_fkey" FOREIGN KEY ("end_responsible_member_id") REFERENCES "group_members"("group_member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_matters" ADD CONSTRAINT "finance_matters_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_matters" ADD CONSTRAINT "finance_matters_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_matters" ADD CONSTRAINT "finance_matters_settled_by_fkey" FOREIGN KEY ("settled_by") REFERENCES "group_members"("group_member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_matter_members" ADD CONSTRAINT "finance_matter_members_finance_matter_id_fkey" FOREIGN KEY ("finance_matter_id") REFERENCES "finance_matters"("finance_matter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_matter_members" ADD CONSTRAINT "finance_matter_members_group_member_id_fkey" FOREIGN KEY ("group_member_id") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payments" ADD CONSTRAINT "finance_payments_finance_matter_id_fkey" FOREIGN KEY ("finance_matter_id") REFERENCES "finance_matters"("finance_matter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payments" ADD CONSTRAINT "finance_payments_from_member_id_fkey" FOREIGN KEY ("from_member_id") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payments" ADD CONSTRAINT "finance_payments_to_member_id_fkey" FOREIGN KEY ("to_member_id") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_votes" ADD CONSTRAINT "approval_votes_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "approvals"("approval_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_votes" ADD CONSTRAINT "approval_votes_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "group_members"("group_member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_log_links" ADD CONSTRAINT "media_log_links_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "message_media"("media_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_usage" ADD CONSTRAINT "storage_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_usage" ADD CONSTRAINT "storage_usage_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pinned_items" ADD CONSTRAINT "pinned_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
