/*
  Warnings:

  - A unique constraint covering the columns `[invoice_number]` on the table `damage_invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "damage_invoices" ADD COLUMN     "invoice_number" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "damage_invoices_invoice_number_key" ON "damage_invoices"("invoice_number");
