/*
  Warnings:

  - A unique constraint covering the columns `[pharmacy_id,idempotency_key]` on the table `purchase_orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "idempotency_key" VARCHAR(150);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_pharmacy_id_idempotency_key_key" ON "purchase_orders"("pharmacy_id", "idempotency_key");
