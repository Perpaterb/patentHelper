-- CreateTable
CREATE TABLE "gift_registries" (
    "registry_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sharing_type" VARCHAR(20) NOT NULL,
    "passcode" VARCHAR(6),
    "web_token" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_registries_pkey" PRIMARY KEY ("registry_id")
);

-- CreateTable
CREATE TABLE "gift_items" (
    "item_id" UUID NOT NULL,
    "registry_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "link" TEXT,
    "photo_url" TEXT,
    "cost" DECIMAL(10,2),
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gift_registries_web_token_key" ON "gift_registries"("web_token");

-- CreateIndex
CREATE INDEX "gift_registries_group_id_idx" ON "gift_registries"("group_id");

-- CreateIndex
CREATE INDEX "gift_registries_creator_id_idx" ON "gift_registries"("creator_id");

-- CreateIndex
CREATE INDEX "gift_registries_web_token_idx" ON "gift_registries"("web_token");

-- CreateIndex
CREATE INDEX "gift_items_registry_id_display_order_idx" ON "gift_items"("registry_id", "display_order");

-- AddForeignKey
ALTER TABLE "gift_registries" ADD CONSTRAINT "gift_registries_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_registries" ADD CONSTRAINT "gift_registries_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "group_members"("group_member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_items" ADD CONSTRAINT "gift_items_registry_id_fkey" FOREIGN KEY ("registry_id") REFERENCES "gift_registries"("registry_id") ON DELETE CASCADE ON UPDATE CASCADE;
