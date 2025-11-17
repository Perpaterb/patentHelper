-- CreateTable
CREATE TABLE "personal_gift_registries" (
    "registry_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sharing_type" VARCHAR(30) NOT NULL,
    "web_token" VARCHAR(32) NOT NULL,
    "passcode" VARCHAR(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_gift_registries_pkey" PRIMARY KEY ("registry_id")
);

-- CreateTable
CREATE TABLE "personal_gift_items" (
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

    CONSTRAINT "personal_gift_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "personal_gift_registry_group_links" (
    "link_id" UUID NOT NULL,
    "registry_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "linked_by" UUID NOT NULL,
    "linked_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_gift_registry_group_links_pkey" PRIMARY KEY ("link_id")
);

-- CreateTable
CREATE TABLE "personal_item_registries" (
    "registry_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sharing_type" VARCHAR(30) NOT NULL,
    "web_token" VARCHAR(32) NOT NULL,
    "passcode" VARCHAR(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_item_registries_pkey" PRIMARY KEY ("registry_id")
);

-- CreateTable
CREATE TABLE "personal_item_registry_items" (
    "item_id" UUID NOT NULL,
    "registry_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "photo_url" TEXT,
    "storage_location" VARCHAR(255),
    "category" VARCHAR(100),
    "currently_borrowed_by" VARCHAR(255),
    "replacement_value" DECIMAL(10,2),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_item_registry_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "personal_item_registry_group_links" (
    "link_id" UUID NOT NULL,
    "registry_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "linked_by" UUID NOT NULL,
    "linked_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_item_registry_group_links_pkey" PRIMARY KEY ("link_id")
);

-- CreateTable
CREATE TABLE "item_registries" (
    "registry_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sharing_type" VARCHAR(20) NOT NULL,
    "passcode" VARCHAR(6),
    "web_token" VARCHAR(32),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_registries_pkey" PRIMARY KEY ("registry_id")
);

-- CreateTable
CREATE TABLE "item_registry_items" (
    "item_id" UUID NOT NULL,
    "registry_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "photo_url" TEXT,
    "storage_location" VARCHAR(255),
    "category" VARCHAR(100),
    "currently_borrowed_by" VARCHAR(255),
    "replacement_value" DECIMAL(10,2),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_registry_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personal_gift_registries_web_token_key" ON "personal_gift_registries"("web_token");

-- CreateIndex
CREATE INDEX "personal_gift_registries_user_id_idx" ON "personal_gift_registries"("user_id");

-- CreateIndex
CREATE INDEX "personal_gift_registries_web_token_idx" ON "personal_gift_registries"("web_token");

-- CreateIndex
CREATE INDEX "personal_gift_items_registry_id_display_order_idx" ON "personal_gift_items"("registry_id", "display_order");

-- CreateIndex
CREATE INDEX "personal_gift_registry_group_links_registry_id_idx" ON "personal_gift_registry_group_links"("registry_id");

-- CreateIndex
CREATE INDEX "personal_gift_registry_group_links_group_id_idx" ON "personal_gift_registry_group_links"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "personal_gift_registry_group_links_registry_id_group_id_key" ON "personal_gift_registry_group_links"("registry_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "personal_item_registries_web_token_key" ON "personal_item_registries"("web_token");

-- CreateIndex
CREATE INDEX "personal_item_registries_user_id_idx" ON "personal_item_registries"("user_id");

-- CreateIndex
CREATE INDEX "personal_item_registries_web_token_idx" ON "personal_item_registries"("web_token");

-- CreateIndex
CREATE INDEX "personal_item_registry_items_registry_id_display_order_idx" ON "personal_item_registry_items"("registry_id", "display_order");

-- CreateIndex
CREATE INDEX "personal_item_registry_group_links_registry_id_idx" ON "personal_item_registry_group_links"("registry_id");

-- CreateIndex
CREATE INDEX "personal_item_registry_group_links_group_id_idx" ON "personal_item_registry_group_links"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "personal_item_registry_group_links_registry_id_group_id_key" ON "personal_item_registry_group_links"("registry_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_registries_web_token_key" ON "item_registries"("web_token");

-- CreateIndex
CREATE INDEX "item_registries_group_id_idx" ON "item_registries"("group_id");

-- CreateIndex
CREATE INDEX "item_registries_creator_id_idx" ON "item_registries"("creator_id");

-- CreateIndex
CREATE INDEX "item_registries_web_token_idx" ON "item_registries"("web_token");

-- CreateIndex
CREATE INDEX "item_registry_items_registry_id_display_order_idx" ON "item_registry_items"("registry_id", "display_order");

-- AddForeignKey
ALTER TABLE "personal_gift_registries" ADD CONSTRAINT "personal_gift_registries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_gift_items" ADD CONSTRAINT "personal_gift_items_registry_id_fkey" FOREIGN KEY ("registry_id") REFERENCES "personal_gift_registries"("registry_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_gift_registry_group_links" ADD CONSTRAINT "personal_gift_registry_group_links_registry_id_fkey" FOREIGN KEY ("registry_id") REFERENCES "personal_gift_registries"("registry_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_gift_registry_group_links" ADD CONSTRAINT "personal_gift_registry_group_links_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_gift_registry_group_links" ADD CONSTRAINT "personal_gift_registry_group_links_linked_by_fkey" FOREIGN KEY ("linked_by") REFERENCES "group_members"("group_member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_item_registries" ADD CONSTRAINT "personal_item_registries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_item_registry_items" ADD CONSTRAINT "personal_item_registry_items_registry_id_fkey" FOREIGN KEY ("registry_id") REFERENCES "personal_item_registries"("registry_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_item_registry_group_links" ADD CONSTRAINT "personal_item_registry_group_links_registry_id_fkey" FOREIGN KEY ("registry_id") REFERENCES "personal_item_registries"("registry_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_item_registry_group_links" ADD CONSTRAINT "personal_item_registry_group_links_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_item_registry_group_links" ADD CONSTRAINT "personal_item_registry_group_links_linked_by_fkey" FOREIGN KEY ("linked_by") REFERENCES "group_members"("group_member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_registries" ADD CONSTRAINT "item_registries_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_registries" ADD CONSTRAINT "item_registries_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "group_members"("group_member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_registry_items" ADD CONSTRAINT "item_registry_items_registry_id_fkey" FOREIGN KEY ("registry_id") REFERENCES "item_registries"("registry_id") ON DELETE CASCADE ON UPDATE CASCADE;
