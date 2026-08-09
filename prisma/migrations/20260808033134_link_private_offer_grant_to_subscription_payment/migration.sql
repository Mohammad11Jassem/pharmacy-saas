/*
  Warnings:

  - A unique constraint covering the columns `[pharmacy_offer_grant_id]` on the table `subscription_payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "subscription_payments" ADD COLUMN     "pharmacy_offer_grant_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_pharmacy_offer_grant_id_key" ON "subscription_payments"("pharmacy_offer_grant_id");

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_pharmacy_offer_grant_id_fkey" FOREIGN KEY ("pharmacy_offer_grant_id") REFERENCES "pharmacy_offer_grants"("pharmacy_offer_grant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
