-- CreateTable
CREATE TABLE "wiki_documents" (
    "document_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "wiki_documents_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "wiki_revisions" (
    "revision_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "edited_by" UUID NOT NULL,
    "edited_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "change_note" VARCHAR(255),

    CONSTRAINT "wiki_revisions_pkey" PRIMARY KEY ("revision_id")
);

-- CreateIndex
CREATE INDEX "wiki_documents_group_id_idx" ON "wiki_documents"("group_id");

-- CreateIndex
CREATE INDEX "wiki_documents_created_at_idx" ON "wiki_documents"("created_at");

-- CreateIndex
CREATE INDEX "wiki_revisions_document_id_idx" ON "wiki_revisions"("document_id");

-- CreateIndex
CREATE INDEX "wiki_revisions_edited_at_idx" ON "wiki_revisions"("edited_at");

-- AddForeignKey
ALTER TABLE "wiki_documents" ADD CONSTRAINT "wiki_documents_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_documents" ADD CONSTRAINT "wiki_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_revisions" ADD CONSTRAINT "wiki_revisions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "wiki_documents"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_revisions" ADD CONSTRAINT "wiki_revisions_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;
