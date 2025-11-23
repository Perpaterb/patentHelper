-- CreateTable
CREATE TABLE "group_documents" (
    "document_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_id" UUID NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "uploaded_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "hidden_at" TIMESTAMP(6),
    "hidden_by" UUID,

    CONSTRAINT "group_documents_pkey" PRIMARY KEY ("document_id")
);

-- CreateIndex
CREATE INDEX "group_documents_group_id_idx" ON "group_documents"("group_id");

-- CreateIndex
CREATE INDEX "group_documents_uploaded_at_idx" ON "group_documents"("uploaded_at");

-- AddForeignKey
ALTER TABLE "group_documents" ADD CONSTRAINT "group_documents_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_documents" ADD CONSTRAINT "group_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_documents" ADD CONSTRAINT "group_documents_hidden_by_fkey" FOREIGN KEY ("hidden_by") REFERENCES "group_members"("group_member_id") ON DELETE SET NULL ON UPDATE CASCADE;
