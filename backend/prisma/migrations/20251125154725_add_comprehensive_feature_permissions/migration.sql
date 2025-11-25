-- Add comprehensive feature permissions to group_settings table
-- This migration transforms the old message group creation fields into a complete
-- feature visibility system for all 8 features in the app

-- Step 1: Add all new columns with defaults
ALTER TABLE "group_settings"
  -- Message Groups permissions
  ADD COLUMN "message_groups_visible_to_parents" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "message_groups_visible_to_caregivers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "message_groups_visible_to_children" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "message_groups_visible_to_supervisors" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "message_groups_creatable_by_parents" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "message_groups_creatable_by_caregivers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "message_groups_creatable_by_children" BOOLEAN NOT NULL DEFAULT false,

  -- Calendar permissions
  ADD COLUMN "calendar_visible_to_parents" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "calendar_visible_to_caregivers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "calendar_visible_to_children" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "calendar_visible_to_supervisors" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "calendar_creatable_by_parents" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "calendar_creatable_by_caregivers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "calendar_creatable_by_children" BOOLEAN NOT NULL DEFAULT false,

  -- Finance permissions (visibility already exists, just add supervisors)
  ADD COLUMN "finance_visible_to_supervisors" BOOLEAN NOT NULL DEFAULT false,

  -- Gift Registry permissions
  ADD COLUMN "gift_registry_visible_to_parents" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "gift_registry_visible_to_caregivers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "gift_registry_visible_to_children" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "gift_registry_visible_to_supervisors" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "gift_registry_creatable_by_parents" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "gift_registry_creatable_by_caregivers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "gift_registry_creatable_by_children" BOOLEAN NOT NULL DEFAULT true,

  -- Secret Santa permissions
  ADD COLUMN "secret_santa_visible_to_parents" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "secret_santa_visible_to_caregivers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "secret_santa_visible_to_children" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "secret_santa_visible_to_supervisors" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "secret_santa_creatable_by_parents" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "secret_santa_creatable_by_caregivers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "secret_santa_creatable_by_children" BOOLEAN NOT NULL DEFAULT false,

  -- Item Registry permissions
  ADD COLUMN "item_registry_visible_to_parents" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "item_registry_visible_to_caregivers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "item_registry_visible_to_children" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "item_registry_visible_to_supervisors" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "item_registry_creatable_by_parents" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "item_registry_creatable_by_caregivers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "item_registry_creatable_by_children" BOOLEAN NOT NULL DEFAULT true,

  -- Wiki permissions
  ADD COLUMN "wiki_visible_to_parents" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "wiki_visible_to_caregivers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "wiki_visible_to_children" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "wiki_visible_to_supervisors" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "wiki_creatable_by_parents" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "wiki_creatable_by_caregivers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "wiki_creatable_by_children" BOOLEAN NOT NULL DEFAULT false,

  -- Secure Documents permissions
  ADD COLUMN "documents_visible_to_parents" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "documents_visible_to_caregivers" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "documents_visible_to_children" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "documents_visible_to_supervisors" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "documents_creatable_by_parents" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "documents_creatable_by_caregivers" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "documents_creatable_by_children" BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Migrate existing data from old columns to new columns
UPDATE "group_settings"
SET
  "message_groups_creatable_by_parents" = "parents_create_message_groups",
  "message_groups_creatable_by_caregivers" = "caregivers_create_message_groups",
  "message_groups_creatable_by_children" = "children_create_message_groups";

-- Step 3: Drop old columns
ALTER TABLE "group_settings"
  DROP COLUMN "parents_create_message_groups",
  DROP COLUMN "caregivers_create_message_groups",
  DROP COLUMN "children_create_message_groups";
