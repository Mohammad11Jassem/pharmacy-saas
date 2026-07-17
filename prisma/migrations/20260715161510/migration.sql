-- AlterTable
ALTER TABLE "sale_invoice_items" ALTER COLUMN "discount_amount" DROP NOT NULL,
ALTER COLUMN "net_total_price" DROP NOT NULL;
