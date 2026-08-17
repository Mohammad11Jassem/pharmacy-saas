-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "expected_receipt_date" DATE;

-- CreateIndex
CREATE INDEX "purchase_orders_pharmacy_id_order_status_expected_receipt_d_idx" ON "purchase_orders"("pharmacy_id", "order_status", "expected_receipt_date");
