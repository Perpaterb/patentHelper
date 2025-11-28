-- AlterTable
ALTER TABLE "media_log_links" ADD COLUMN     "logExportExportId" UUID;

-- CreateTable
CREATE TABLE "log_exports" (
    "export_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filters" JSONB NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "log_exports_pkey" PRIMARY KEY ("export_id")
);

-- CreateIndex
CREATE INDEX "log_exports_group_id_idx" ON "log_exports"("group_id");

-- CreateIndex
CREATE INDEX "log_exports_created_at_idx" ON "log_exports"("created_at");

-- AddForeignKey
ALTER TABLE "media_log_links" ADD CONSTRAINT "media_log_links_logExportExportId_fkey" FOREIGN KEY ("logExportExportId") REFERENCES "log_exports"("export_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_exports" ADD CONSTRAINT "log_exports_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_exports" ADD CONSTRAINT "log_exports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "group_members"("group_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;
