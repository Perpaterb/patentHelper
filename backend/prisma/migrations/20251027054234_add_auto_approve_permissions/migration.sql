-- CreateTable
CREATE TABLE "auto_approve_permissions" (
    "permission_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "grantor_id" UUID NOT NULL,
    "grantee_id" UUID NOT NULL,
    "can_hide_messages" BOOLEAN NOT NULL DEFAULT false,
    "can_add_members" BOOLEAN NOT NULL DEFAULT false,
    "can_remove_members" BOOLEAN NOT NULL DEFAULT false,
    "can_assign_roles" BOOLEAN NOT NULL DEFAULT false,
    "can_change_roles" BOOLEAN NOT NULL DEFAULT false,
    "can_assign_relationships" BOOLEAN NOT NULL DEFAULT false,
    "can_change_relationships" BOOLEAN NOT NULL DEFAULT false,
    "can_create_calendar_events" BOOLEAN NOT NULL DEFAULT false,
    "can_assign_children_to_events" BOOLEAN NOT NULL DEFAULT false,
    "can_assign_caregivers_to_events" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_approve_permissions_pkey" PRIMARY KEY ("permission_id")
);

-- CreateIndex
CREATE INDEX "auto_approve_permissions_group_id_grantor_id_idx" ON "auto_approve_permissions"("group_id", "grantor_id");

-- CreateIndex
CREATE INDEX "auto_approve_permissions_group_id_grantee_id_idx" ON "auto_approve_permissions"("group_id", "grantee_id");

-- CreateIndex
CREATE UNIQUE INDEX "auto_approve_permissions_group_id_grantor_id_grantee_id_key" ON "auto_approve_permissions"("group_id", "grantor_id", "grantee_id");

-- AddForeignKey
ALTER TABLE "auto_approve_permissions" ADD CONSTRAINT "auto_approve_permissions_grantee_id_fkey" FOREIGN KEY ("grantee_id") REFERENCES "group_members"("group_member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_approve_permissions" ADD CONSTRAINT "auto_approve_permissions_grantor_id_fkey" FOREIGN KEY ("grantor_id") REFERENCES "group_members"("group_member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_approve_permissions" ADD CONSTRAINT "auto_approve_permissions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;
