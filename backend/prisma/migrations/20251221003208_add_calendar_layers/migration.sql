-- CreateTable
CREATE TABLE "calendar_layer_preferences" (
    "preference_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "member_layer_id" UUID NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "custom_color" VARCHAR(7),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_layer_preferences_pkey" PRIMARY KEY ("preference_id")
);

-- CreateTable
CREATE TABLE "calendar_event_reminders" (
    "reminder_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reminded_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_event_reminders_pkey" PRIMARY KEY ("reminder_id")
);

-- CreateIndex
CREATE INDEX "calendar_layer_preferences_user_id_group_id_idx" ON "calendar_layer_preferences"("user_id", "group_id");

-- CreateIndex
CREATE INDEX "calendar_layer_preferences_group_id_idx" ON "calendar_layer_preferences"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_layer_preferences_user_id_group_id_member_layer_id_key" ON "calendar_layer_preferences"("user_id", "group_id", "member_layer_id");

-- CreateIndex
CREATE INDEX "calendar_event_reminders_user_id_idx" ON "calendar_event_reminders"("user_id");

-- CreateIndex
CREATE INDEX "calendar_event_reminders_event_id_idx" ON "calendar_event_reminders"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_reminders_event_id_user_id_key" ON "calendar_event_reminders"("event_id", "user_id");

-- AddForeignKey
ALTER TABLE "calendar_layer_preferences" ADD CONSTRAINT "calendar_layer_preferences_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_layer_preferences" ADD CONSTRAINT "calendar_layer_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_layer_preferences" ADD CONSTRAINT "calendar_layer_preferences_member_layer_id_fkey" FOREIGN KEY ("member_layer_id") REFERENCES "group_members"("group_member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_reminders" ADD CONSTRAINT "calendar_event_reminders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_reminders" ADD CONSTRAINT "calendar_event_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
