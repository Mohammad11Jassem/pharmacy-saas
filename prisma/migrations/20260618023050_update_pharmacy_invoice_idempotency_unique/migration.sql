/*
  Warnings:

  - A unique constraint covering the columns `[pharmacy_id,invoice_type,idempotency_key]` on the table `pharmacy_invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "pharmacy_invoices_pharmacy_id_idempotency_key_key";

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_invoices_pharmacy_id_invoice_type_idempotency_key_key" ON "pharmacy_invoices"("pharmacy_id", "invoice_type", "idempotency_key");
