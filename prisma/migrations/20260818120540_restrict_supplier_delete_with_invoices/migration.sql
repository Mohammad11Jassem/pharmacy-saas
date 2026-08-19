-- DropForeignKey
ALTER TABLE "supplier_invoice_items" DROP CONSTRAINT "supplier_invoice_items_supplier_invoice_id_fkey";

-- AddForeignKey
ALTER TABLE "supplier_invoice_items" ADD CONSTRAINT "supplier_invoice_items_supplier_invoice_id_fkey" FOREIGN KEY ("supplier_invoice_id") REFERENCES "supplier_invoices"("supplier_invoice_id") ON DELETE RESTRICT ON UPDATE CASCADE;
