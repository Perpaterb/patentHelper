-- CreateTable
CREATE TABLE "secret_santa_gift_registries" (
    "registry_id" UUID NOT NULL,
    "kris_kringle_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "secret_santa_gift_registries_pkey" PRIMARY KEY ("registry_id")
);

-- CreateTable
CREATE TABLE "secret_santa_gift_items" (
    "item_id" UUID NOT NULL,
    "registry_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "link" TEXT,
    "photo_url" TEXT,
    "cost" DECIMAL(10,2),
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_purchased" BOOLEAN NOT NULL DEFAULT false,
    "purchased_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "secret_santa_gift_items_pkey" PRIMARY KEY ("item_id")
);

-- Rename column from gift_registry_id to ss_gift_registry_id in kris_kringle_participants
ALTER TABLE "kris_kringle_participants" RENAME COLUMN "gift_registry_id" TO "ss_gift_registry_id";

-- CreateIndex
CREATE INDEX "secret_santa_gift_registries_kris_kringle_id_idx" ON "secret_santa_gift_registries"("kris_kringle_id");

-- CreateIndex
CREATE INDEX "secret_santa_gift_items_registry_id_display_order_idx" ON "secret_santa_gift_items"("registry_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "kris_kringle_participants_ss_gift_registry_id_key" ON "kris_kringle_participants"("ss_gift_registry_id");

-- AddForeignKey
ALTER TABLE "kris_kringle_participants" ADD CONSTRAINT "kris_kringle_participants_ss_gift_registry_id_fkey" FOREIGN KEY ("ss_gift_registry_id") REFERENCES "secret_santa_gift_registries"("registry_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_santa_gift_registries" ADD CONSTRAINT "secret_santa_gift_registries_kris_kringle_id_fkey" FOREIGN KEY ("kris_kringle_id") REFERENCES "kris_kringles"("kris_kringle_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_santa_gift_items" ADD CONSTRAINT "secret_santa_gift_items_registry_id_fkey" FOREIGN KEY ("registry_id") REFERENCES "secret_santa_gift_registries"("registry_id") ON DELETE CASCADE ON UPDATE CASCADE;
