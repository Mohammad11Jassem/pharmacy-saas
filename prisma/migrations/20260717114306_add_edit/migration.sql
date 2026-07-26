-- AlterTable
ALTER TABLE "sale_invoice_items" ADD COLUMN     "discount_amount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "net_total_price" DECIMAL(12,2);
