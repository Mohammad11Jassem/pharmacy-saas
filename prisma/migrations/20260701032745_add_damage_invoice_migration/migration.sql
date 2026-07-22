/*
  Warnings:

  - You are about to drop the column `base_quantity` on the `damage_invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `damage_reason` on the `damage_invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `pharmacy_drug_id` on the `damage_invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `unit_factor_to_base` on the `damage_invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `unit_type` on the `damage_invoice_items` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invoice_number]` on the table `damage_invoices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `quantity_damaged` to the `damage_invoice_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "damage_invoice_items" DROP CONSTRAINT "damage_invoice_items_pharmacy_drug_id_fkey";

-- DropIndex
DROP INDEX "damage_invoice_items_pharmacy_drug_id_idx";

-- AlterTable
ALTER TABLE "damage_invoice_items" DROP COLUMN "base_quantity",
DROP COLUMN "damage_reason",
DROP COLUMN "pharmacy_drug_id",
DROP COLUMN "unit_factor_to_base",
DROP COLUMN "unit_type",
ADD COLUMN     "quantity_damaged" INTEGER NOT NULL,
ADD COLUMN     "unit_consumer_price" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "damage_invoices" ADD COLUMN     "damage_reason" TEXT,
ADD COLUMN     "invoice_number" TEXT;

-- CreateTable
CREATE TABLE "private_drug_ingredients" (
    "private_drug_ingredient_id" SERIAL NOT NULL,
    "private_drug_id" INTEGER NOT NULL,
    "ingredient_id" INTEGER NOT NULL,
    "strength_value" DECIMAL(65,30),
    "unit" TEXT,

    CONSTRAINT "private_drug_ingredients_pkey" PRIMARY KEY ("private_drug_ingredient_id")
);

-- CreateTable
CREATE TABLE "private_drug_category_assignments" (
    "unique_id" SERIAL NOT NULL,
    "private_drug_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "private_drug_category_assignments_pkey" PRIMARY KEY ("unique_id")
);

-- CreateIndex
CREATE INDEX "private_drug_ingredients_private_drug_id_idx" ON "private_drug_ingredients"("private_drug_id");

-- CreateIndex
CREATE INDEX "private_drug_ingredients_ingredient_id_idx" ON "private_drug_ingredients"("ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "private_drug_ingredients_private_drug_id_ingredient_id_key" ON "private_drug_ingredients"("private_drug_id", "ingredient_id");

-- CreateIndex
CREATE INDEX "private_drug_category_assignments_private_drug_id_idx" ON "private_drug_category_assignments"("private_drug_id");

-- CreateIndex
CREATE INDEX "private_drug_category_assignments_category_id_idx" ON "private_drug_category_assignments"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "private_drug_category_assignments_private_drug_id_category__key" ON "private_drug_category_assignments"("private_drug_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "damage_invoices_invoice_number_key" ON "damage_invoices"("invoice_number");

-- AddForeignKey
ALTER TABLE "private_drug_ingredients" ADD CONSTRAINT "private_drug_ingredients_private_drug_id_fkey" FOREIGN KEY ("private_drug_id") REFERENCES "private_drugs"("private_drug_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_drug_ingredients" ADD CONSTRAINT "private_drug_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "active_ingredients"("ingredient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_drug_category_assignments" ADD CONSTRAINT "private_drug_category_assignments_private_drug_id_fkey" FOREIGN KEY ("private_drug_id") REFERENCES "private_drugs"("private_drug_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_drug_category_assignments" ADD CONSTRAINT "private_drug_category_assignments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "drug_categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;
