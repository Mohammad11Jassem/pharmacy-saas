/*
  Warnings:

  - A unique constraint covering the columns `[supplier_id,invoice_number]` on the table `supplier_invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "supplier_invoices_invoice_number_key";

-- CreateIndex
CREATE UNIQUE INDEX "supplier_invoices_supplier_id_invoice_number_key" ON "supplier_invoices"("supplier_id", "invoice_number");
