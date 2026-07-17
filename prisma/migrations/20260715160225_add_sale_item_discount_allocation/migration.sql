ALTER TABLE "sale_invoice_items"
ADD COLUMN "discount_amount" DECIMAL(12,2);

ALTER TABLE "sale_invoice_items"
ADD COLUMN "net_total_price" DECIMAL(12,2);


UPDATE "sale_invoice_items"
SET
    "discount_amount" = 0,
    "net_total_price" = "total_price";


ALTER TABLE "sale_invoice_items"
ALTER COLUMN "discount_amount" SET DEFAULT 0;

ALTER TABLE "sale_invoice_items"
ALTER COLUMN "discount_amount" SET NOT NULL;

ALTER TABLE "sale_invoice_items"
ALTER COLUMN "net_total_price" SET NOT NULL;