/*
  Warnings:

  - A unique constraint covering the columns `[pharmacy_id,phone]` on the table `patients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pharmacy_id,national_id]` on the table `patients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pharmacy_id,idempotency_key]` on the table `pharmacy_invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "pharmacy_invoices" ADD COLUMN     "idempotency_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "patients_pharmacy_id_phone_key" ON "patients"("pharmacy_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "patients_pharmacy_id_national_id_key" ON "patients"("pharmacy_id", "national_id");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_invoices_pharmacy_id_idempotency_key_key" ON "pharmacy_invoices"("pharmacy_id", "idempotency_key");
