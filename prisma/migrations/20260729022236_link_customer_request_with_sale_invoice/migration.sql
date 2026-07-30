-- AlterTable
ALTER TABLE "sale_invoice_items" ADD COLUMN     "customer_request_item_id" INTEGER;

-- AlterTable
ALTER TABLE "sale_invoices" ADD COLUMN     "customer_request_id" INTEGER;

-- CreateIndex
CREATE INDEX "sale_invoice_items_customer_request_item_id_idx" ON "sale_invoice_items"("customer_request_item_id");

-- CreateIndex
CREATE INDEX "sale_invoices_customer_request_id_idx" ON "sale_invoices"("customer_request_id");

-- AddForeignKey
ALTER TABLE "sale_invoices" ADD CONSTRAINT "sale_invoices_customer_request_id_fkey" FOREIGN KEY ("customer_request_id") REFERENCES "CustomerRequest"("customerRequestId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_invoice_items" ADD CONSTRAINT "sale_invoice_items_customer_request_item_id_fkey" FOREIGN KEY ("customer_request_item_id") REFERENCES "CustomerRequestItem"("customerRequestItemId") ON DELETE SET NULL ON UPDATE CASCADE;
