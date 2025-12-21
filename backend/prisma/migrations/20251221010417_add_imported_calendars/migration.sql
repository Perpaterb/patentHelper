-- CreateTable
CREATE TABLE "imported_calendars" (
    "imported_calendar_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "source_type" VARCHAR(10) NOT NULL,
    "source_url" TEXT,
    "color" VARCHAR(7) NOT NULL,
    "sync_interval_hours" INTEGER NOT NULL DEFAULT 6,
    "last_sync_at" TIMESTAMP(6),
    "last_sync_status" VARCHAR(20),
    "last_sync_error" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imported_calendars_pkey" PRIMARY KEY ("imported_calendar_id")
);

-- CreateTable
CREATE TABLE "imported_calendar_events" (
    "event_id" UUID NOT NULL,
    "imported_calendar_id" UUID NOT NULL,
    "external_uid" VARCHAR(500) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "location" VARCHAR(500),
    "start_time" TIMESTAMP(6) NOT NULL,
    "end_time" TIMESTAMP(6) NOT NULL,
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_rule" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imported_calendar_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "imported_calendar_preferences" (
    "preference_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "imported_calendar_id" UUID NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "custom_color" VARCHAR(7),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imported_calendar_preferences_pkey" PRIMARY KEY ("preference_id")
);

-- CreateIndex
CREATE INDEX "imported_calendars_group_id_idx" ON "imported_calendars"("group_id");

-- CreateIndex
CREATE INDEX "imported_calendars_last_sync_at_idx" ON "imported_calendars"("last_sync_at");

-- CreateIndex
CREATE INDEX "imported_calendar_events_imported_calendar_id_idx" ON "imported_calendar_events"("imported_calendar_id");

-- CreateIndex
CREATE INDEX "imported_calendar_events_start_time_end_time_idx" ON "imported_calendar_events"("start_time", "end_time");

-- CreateIndex
CREATE UNIQUE INDEX "imported_calendar_events_imported_calendar_id_external_uid_key" ON "imported_calendar_events"("imported_calendar_id", "external_uid");

-- CreateIndex
CREATE INDEX "imported_calendar_preferences_user_id_idx" ON "imported_calendar_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "imported_calendar_preferences_user_id_imported_calendar_id_key" ON "imported_calendar_preferences"("user_id", "imported_calendar_id");

-- AddForeignKey
ALTER TABLE "imported_calendars" ADD CONSTRAINT "imported_calendars_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_calendars" ADD CONSTRAINT "imported_calendars_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_calendar_events" ADD CONSTRAINT "imported_calendar_events_imported_calendar_id_fkey" FOREIGN KEY ("imported_calendar_id") REFERENCES "imported_calendars"("imported_calendar_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_calendar_preferences" ADD CONSTRAINT "imported_calendar_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_calendar_preferences" ADD CONSTRAINT "imported_calendar_preferences_imported_calendar_id_fkey" FOREIGN KEY ("imported_calendar_id") REFERENCES "imported_calendars"("imported_calendar_id") ON DELETE CASCADE ON UPDATE CASCADE;
