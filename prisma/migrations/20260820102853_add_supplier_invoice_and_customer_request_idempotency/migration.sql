/*
  Warnings:

  - A unique constraint covering the columns `[pharmacyId,idempotency_key]` on the table `CustomerRequest` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[supplier_id,idempotency_key]` on the table `supplier_invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CustomerRequest" ADD COLUMN     "idempotency_key" VARCHAR(150);

-- AlterTable
ALTER TABLE "supplier_invoices" ADD COLUMN     "idempotency_key" VARCHAR(150);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRequest_pharmacyId_idempotency_key_key" ON "CustomerRequest"("pharmacyId", "idempotency_key");

-- CreateIndex
CREATE INDEX "batches_status_expiry_date_idx" ON "batches"("status", "expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_invoices_supplier_id_idempotency_key_key" ON "supplier_invoices"("supplier_id", "idempotency_key");
