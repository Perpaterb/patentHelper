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

-- CreateTable
CREATE TABLE "device_tokens" (
    "token_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "expo_push_token" VARCHAR(255) NOT NULL,
    "device_name" VARCHAR(100),
    "platform" VARCHAR(10) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("token_id")
);

-- CreateIndex
CREATE INDEX "webrtc_signals_call_id_to_peer_id_is_consumed_idx" ON "webrtc_signals"("call_id", "to_peer_id", "is_consumed");

-- CreateIndex
CREATE INDEX "webrtc_signals_created_at_idx" ON "webrtc_signals"("created_at");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");

-- CreateIndex
CREATE INDEX "device_tokens_is_active_idx" ON "device_tokens"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_user_id_expo_push_token_key" ON "device_tokens"("user_id", "expo_push_token");

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
