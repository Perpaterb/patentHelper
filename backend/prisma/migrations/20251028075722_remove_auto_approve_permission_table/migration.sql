/*
  Warnings:

  - You are about to drop the `auto_approve_permissions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."auto_approve_permissions" DROP CONSTRAINT "auto_approve_permissions_grantee_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."auto_approve_permissions" DROP CONSTRAINT "auto_approve_permissions_grantor_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."auto_approve_permissions" DROP CONSTRAINT "auto_approve_permissions_group_id_fkey";

-- DropTable
DROP TABLE "public"."auto_approve_permissions";
