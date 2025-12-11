-- CreateTable
CREATE TABLE "phone_call_recording_chunks" (
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
CREATE TABLE "video_call_recording_chunks" (
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

-- CreateTable
CREATE TABLE "webrtc_signals" (
    "signal_id" UUID NOT NULL,
    "call_id" UUID NOT NULL,
    "call_type" VARCHAR(10) NOT NULL,
    "from_peer_id" VARCHAR(100) NOT NULL,
    "to_peer_id" VARCHAR(100) NOT NULL,
    "signal_type" VARCHAR(20) NOT NULL,
    "signal_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_consumed" BOOLEAN NOT NULL DEFAULT false,
    "consumed_at" TIMESTAMP(6),

    CONSTRAINT "webrtc_signals_pkey" PRIMARY KEY ("signal_id")
);

-- CreateIndex
CREATE INDEX "phone_call_recording_chunks_call_id_idx" ON "phone_call_recording_chunks"("call_id");

-- CreateIndex
CREATE INDEX "phone_call_recording_chunks_status_idx" ON "phone_call_recording_chunks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "phone_call_recording_chunks_call_id_chunk_index_key" ON "phone_call_recording_chunks"("call_id", "chunk_index");

-- CreateIndex
CREATE INDEX "video_call_recording_chunks_call_id_idx" ON "video_call_recording_chunks"("call_id");

-- CreateIndex
CREATE INDEX "video_call_recording_chunks_status_idx" ON "video_call_recording_chunks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "video_call_recording_chunks_call_id_chunk_index_key" ON "video_call_recording_chunks"("call_id", "chunk_index");

-- CreateIndex
CREATE INDEX "webrtc_signals_call_id_to_peer_id_is_consumed_idx" ON "webrtc_signals"("call_id", "to_peer_id", "is_consumed");

-- CreateIndex
CREATE INDEX "webrtc_signals_created_at_idx" ON "webrtc_signals"("created_at");

-- AddForeignKey
ALTER TABLE "phone_call_recording_chunks" ADD CONSTRAINT "phone_call_recording_chunks_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "phone_calls"("call_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_call_recording_chunks" ADD CONSTRAINT "video_call_recording_chunks_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "video_calls"("call_id") ON DELETE CASCADE ON UPDATE CASCADE;
