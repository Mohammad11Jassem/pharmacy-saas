/*
  Warnings:

  - The values [APPROVED,REJECTED] on the enum `SupplierInvoiceStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SupplierInvoiceStatus_new" AS ENUM ('PENDING', 'PARTIALLY_STOCKED', 'STOCKED', 'CANCELLED');
ALTER TABLE "public"."supplier_invoices" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "supplier_invoices" ALTER COLUMN "status" TYPE "SupplierInvoiceStatus_new" USING ("status"::text::"SupplierInvoiceStatus_new");
ALTER TYPE "SupplierInvoiceStatus" RENAME TO "SupplierInvoiceStatus_old";
ALTER TYPE "SupplierInvoiceStatus_new" RENAME TO "SupplierInvoiceStatus";
DROP TYPE "public"."SupplierInvoiceStatus_old";
ALTER TABLE "supplier_invoices" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
