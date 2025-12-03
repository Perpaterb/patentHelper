-- AlterTable
ALTER TABLE "phone_calls" ADD COLUMN     "recording_size_bytes" BIGINT;

-- CreateTable
CREATE TABLE "video_calls" (
    "call_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "initiated_by" UUID NOT NULL,
    "started_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connected_at" TIMESTAMP(6),
    "ended_at" TIMESTAMP(6),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ringing',
    "duration_ms" INTEGER,
    "recording_file_id" UUID,
    "recording_url" TEXT,
    "recording_duration_ms" INTEGER,
    "recording_size_bytes" BIGINT,
    "recording_is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "recording_hidden_by" UUID,
    "recording_hidden_at" TIMESTAMP(6),

    CONSTRAINT "video_calls_pkey" PRIMARY KEY ("call_id")
);

-- CreateTable
CREATE TABLE "video_call_participants" (
    "call_id" UUID NOT NULL,
    "group_member_id" UUID NOT NULL,
    "invited_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(6),
    "joined_at" TIMESTAMP(6),
    "left_at" TIMESTAMP(6),
    "status" VARCHAR(20) NOT NULL DEFAULT 'invited',

    CONSTRAINT "video_call_participants_pkey" PRIMARY KEY ("call_id","group_member_id")
);

-- CreateIndex
CREATE INDEX "video_calls_group_id_idx" ON "video_calls"("group_id");

-- CreateIndex
CREATE INDEX "video_calls_status_idx" ON "video_calls"("status");

-- CreateIndex
CREATE INDEX "video_calls_started_at_idx" ON "video_calls"("started_at");

-- CreateIndex
CREATE INDEX "video_call_participants_group_member_id_idx" ON "video_call_participants"("group_member_id");

-- CreateIndex
CREATE INDEX "video_call_participants_status_idx" ON "video_call_participants"("status");

-- AddForeignKey
ALTER TABLE "video_calls" ADD CONSTRAINT "video_calls_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_calls" ADD CONSTRAINT "video_calls_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_calls" ADD CONSTRAINT "video_calls_recording_hidden_by_fkey" FOREIGN KEY ("recording_hidden_by") REFERENCES "group_members"("group_member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_call_participants" ADD CONSTRAINT "video_call_participants_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "video_calls"("call_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_call_participants" ADD CONSTRAINT "video_call_participants_group_member_id_fkey" FOREIGN KEY ("group_member_id") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;
