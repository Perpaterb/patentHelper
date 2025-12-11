-- CreateTable
CREATE TABLE IF NOT EXISTS "phone_call_recording_chunks" (
    "chunk_id" UUID NOT NULL,
    "call_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "file_id" UUID NOT NULL,
    "file_url" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "started_at" TIMESTAMP(6) NOT NULL,
    "ended_at" TIMESTAMP(6) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'processing',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_call_recording_chunks_pkey" PRIMARY KEY ("chunk_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "video_call_recording_chunks" (
    "chunk_id" UUID NOT NULL,
    "call_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "file_id" UUID NOT NULL,
    "file_url" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "started_at" TIMESTAMP(6) NOT NULL,
    "ended_at" TIMESTAMP(6) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'processing',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_call_recording_chunks_pkey" PRIMARY KEY ("chunk_id")
);

-- webrtc_signals table already exists from previous migration

-- CreateIndex
CREATE INDEX IF NOT EXISTS "phone_call_recording_chunks_call_id_idx" ON "phone_call_recording_chunks"("call_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "phone_call_recording_chunks_status_idx" ON "phone_call_recording_chunks"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "phone_call_recording_chunks_call_id_chunk_index_key" ON "phone_call_recording_chunks"("call_id", "chunk_index");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "video_call_recording_chunks_call_id_idx" ON "video_call_recording_chunks"("call_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "video_call_recording_chunks_status_idx" ON "video_call_recording_chunks"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "video_call_recording_chunks_call_id_chunk_index_key" ON "video_call_recording_chunks"("call_id", "chunk_index");

-- Indexes for webrtc_signals already exist

-- AddForeignKey
ALTER TABLE "phone_call_recording_chunks" ADD CONSTRAINT "phone_call_recording_chunks_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "phone_calls"("call_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_call_recording_chunks" ADD CONSTRAINT "video_call_recording_chunks_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "video_calls"("call_id") ON DELETE CASCADE ON UPDATE CASCADE;
