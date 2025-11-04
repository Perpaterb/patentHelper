-- CreateTable
CREATE TABLE "wish_lists" (
    "wish_list_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "for_member_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "wish_lists_pkey" PRIMARY KEY ("wish_list_id")
);

-- CreateTable
CREATE TABLE "wish_list_items" (
    "item_id" UUID NOT NULL,
    "wish_list_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "image_url" TEXT,
    "price" DECIMAL(12,2),
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "is_purchased" BOOLEAN NOT NULL DEFAULT false,
    "purchased_by" UUID,
    "purchased_at" TIMESTAMP(6),
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "wish_list_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "kris_kringles" (
    "kris_kringle_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "price_limit" DECIMAL(12,2),
    "reveal_date" TIMESTAMP(6),
    "exchange_date" TIMESTAMP(6),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "kris_kringles_pkey" PRIMARY KEY ("kris_kringle_id")
);

-- CreateTable
CREATE TABLE "kris_kringle_participants" (
    "participant_id" UUID NOT NULL,
    "kris_kringle_id" UUID NOT NULL,
    "group_member_id" UUID,
    "email" VARCHAR(255),
    "name" VARCHAR(255) NOT NULL,
    "has_joined" BOOLEAN NOT NULL DEFAULT false,
    "wish_list_id" UUID,
    "joined_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kris_kringle_participants_pkey" PRIMARY KEY ("participant_id")
);

-- CreateTable
CREATE TABLE "kris_kringle_matches" (
    "match_id" UUID NOT NULL,
    "kris_kringle_id" UUID NOT NULL,
    "giver_id" UUID NOT NULL,
    "receiver_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kris_kringle_matches_pkey" PRIMARY KEY ("match_id")
);

-- CreateTable
CREATE TABLE "kris_kringle_exclusions" (
    "exclusion_id" UUID NOT NULL,
    "kris_kringle_id" UUID NOT NULL,
    "participant1_id" UUID NOT NULL,
    "participant2_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kris_kringle_exclusions_pkey" PRIMARY KEY ("exclusion_id")
);

-- CreateIndex
CREATE INDEX "wish_lists_group_id_idx" ON "wish_lists"("group_id");

-- CreateIndex
CREATE INDEX "wish_lists_for_member_id_idx" ON "wish_lists"("for_member_id");

-- CreateIndex
CREATE INDEX "wish_list_items_wish_list_id_idx" ON "wish_list_items"("wish_list_id");

-- CreateIndex
CREATE INDEX "wish_list_items_is_purchased_idx" ON "wish_list_items"("is_purchased");

-- CreateIndex
CREATE INDEX "kris_kringles_group_id_idx" ON "kris_kringles"("group_id");

-- CreateIndex
CREATE INDEX "kris_kringles_status_idx" ON "kris_kringles"("status");

-- CreateIndex
CREATE INDEX "kris_kringle_participants_kris_kringle_id_idx" ON "kris_kringle_participants"("kris_kringle_id");

-- CreateIndex
CREATE INDEX "kris_kringle_participants_group_member_id_idx" ON "kris_kringle_participants"("group_member_id");

-- CreateIndex
CREATE INDEX "kris_kringle_matches_kris_kringle_id_idx" ON "kris_kringle_matches"("kris_kringle_id");

-- CreateIndex
CREATE UNIQUE INDEX "kris_kringle_matches_kris_kringle_id_giver_id_key" ON "kris_kringle_matches"("kris_kringle_id", "giver_id");

-- CreateIndex
CREATE INDEX "kris_kringle_exclusions_kris_kringle_id_idx" ON "kris_kringle_exclusions"("kris_kringle_id");

-- CreateIndex
CREATE UNIQUE INDEX "kris_kringle_exclusions_kris_kringle_id_participant1_id_par_key" ON "kris_kringle_exclusions"("kris_kringle_id", "participant1_id", "participant2_id");

-- AddForeignKey
ALTER TABLE "wish_lists" ADD CONSTRAINT "wish_lists_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wish_lists" ADD CONSTRAINT "wish_lists_for_member_id_fkey" FOREIGN KEY ("for_member_id") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wish_lists" ADD CONSTRAINT "wish_lists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wish_list_items" ADD CONSTRAINT "wish_list_items_wish_list_id_fkey" FOREIGN KEY ("wish_list_id") REFERENCES "wish_lists"("wish_list_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wish_list_items" ADD CONSTRAINT "wish_list_items_purchased_by_fkey" FOREIGN KEY ("purchased_by") REFERENCES "group_members"("group_member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kris_kringles" ADD CONSTRAINT "kris_kringles_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kris_kringles" ADD CONSTRAINT "kris_kringles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kris_kringle_participants" ADD CONSTRAINT "kris_kringle_participants_kris_kringle_id_fkey" FOREIGN KEY ("kris_kringle_id") REFERENCES "kris_kringles"("kris_kringle_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kris_kringle_participants" ADD CONSTRAINT "kris_kringle_participants_group_member_id_fkey" FOREIGN KEY ("group_member_id") REFERENCES "group_members"("group_member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kris_kringle_participants" ADD CONSTRAINT "kris_kringle_participants_wish_list_id_fkey" FOREIGN KEY ("wish_list_id") REFERENCES "wish_lists"("wish_list_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kris_kringle_matches" ADD CONSTRAINT "kris_kringle_matches_kris_kringle_id_fkey" FOREIGN KEY ("kris_kringle_id") REFERENCES "kris_kringles"("kris_kringle_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kris_kringle_matches" ADD CONSTRAINT "kris_kringle_matches_giver_id_fkey" FOREIGN KEY ("giver_id") REFERENCES "kris_kringle_participants"("participant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kris_kringle_matches" ADD CONSTRAINT "kris_kringle_matches_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "kris_kringle_participants"("participant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kris_kringle_exclusions" ADD CONSTRAINT "kris_kringle_exclusions_kris_kringle_id_fkey" FOREIGN KEY ("kris_kringle_id") REFERENCES "kris_kringles"("kris_kringle_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kris_kringle_exclusions" ADD CONSTRAINT "kris_kringle_exclusions_participant1_id_fkey" FOREIGN KEY ("participant1_id") REFERENCES "kris_kringle_participants"("participant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kris_kringle_exclusions" ADD CONSTRAINT "kris_kringle_exclusions_participant2_id_fkey" FOREIGN KEY ("participant2_id") REFERENCES "kris_kringle_participants"("participant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
