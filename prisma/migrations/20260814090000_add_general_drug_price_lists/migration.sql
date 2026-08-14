-- CreateTable
CREATE TABLE "general_drug_price_lists" (
    "general_drug_price_list_id" SERIAL NOT NULL,
    "version" INTEGER NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "general_drug_price_lists_pkey" PRIMARY KEY ("general_drug_price_list_id")
);

-- CreateTable
CREATE TABLE "general_drug_price_list_items" (
    "general_drug_price_list_item_id" SERIAL NOT NULL,
    "general_drug_price_list_id" INTEGER NOT NULL,
    "general_drug_id" INTEGER NOT NULL,
    "net_price" DECIMAL(12,2) NOT NULL,
    "consumer_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "general_drug_price_list_items_pkey" PRIMARY KEY ("general_drug_price_list_item_id")
);

-- AlterTable
ALTER TABLE "pharmacies"
ADD COLUMN "last_applied_general_drug_price_list_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "general_drug_price_lists_version_key"
ON "general_drug_price_lists"("version");

-- CreateIndex
CREATE INDEX "general_drug_price_lists_published_at_idx"
ON "general_drug_price_lists"("published_at");

-- CreateIndex
CREATE UNIQUE INDEX "general_drug_price_list_items_general_drug_price_list_id_general_drug_id_key"
ON "general_drug_price_list_items"("general_drug_price_list_id", "general_drug_id");

-- CreateIndex
CREATE INDEX "general_drug_price_list_items_general_drug_id_idx"
ON "general_drug_price_list_items"("general_drug_id");

-- CreateIndex
CREATE INDEX "pharmacies_last_applied_general_drug_price_list_id_idx"
ON "pharmacies"("last_applied_general_drug_price_list_id");

-- AddForeignKey
ALTER TABLE "general_drug_price_list_items"
ADD CONSTRAINT "general_drug_price_list_items_general_drug_price_list_id_fkey"
FOREIGN KEY ("general_drug_price_list_id")
REFERENCES "general_drug_price_lists"("general_drug_price_list_id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_drug_price_list_items"
ADD CONSTRAINT "general_drug_price_list_items_general_drug_id_fkey"
FOREIGN KEY ("general_drug_id")
REFERENCES "general_drugs"("general_drug_id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacies"
ADD CONSTRAINT "pharmacies_last_applied_general_drug_price_list_id_fkey"
FOREIGN KEY ("last_applied_general_drug_price_list_id")
REFERENCES "general_drug_price_lists"("general_drug_price_list_id")
ON DELETE SET NULL ON UPDATE CASCADE;
