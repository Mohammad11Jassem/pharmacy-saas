/*
  Warnings:

  - The primary key for the `general_drug_price_list_items` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `consumer_price` on the `general_drug_price_list_items` table. All the data in the column will be lost.
  - You are about to drop the column `general_drug_id` on the `general_drug_price_list_items` table. All the data in the column will be lost.
  - You are about to drop the column `general_drug_price_list_id` on the `general_drug_price_list_items` table. All the data in the column will be lost.
  - You are about to drop the column `general_drug_price_list_item_id` on the `general_drug_price_list_items` table. All the data in the column will be lost.
  - You are about to drop the column `net_price` on the `general_drug_price_list_items` table. All the data in the column will be lost.
  - The primary key for the `general_drug_price_lists` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `general_drug_price_list_id` on the `general_drug_price_lists` table. All the data in the column will be lost.
  - You are about to drop the column `published_at` on the `general_drug_price_lists` table. All the data in the column will be lost.
  - You are about to drop the column `last_applied_general_drug_price_list_id` on the `pharmacies` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[generalDrugPriceListId,generalDrugId]` on the table `general_drug_price_list_items` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `generalDrugId` to the `general_drug_price_list_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `generalDrugPriceListId` to the `general_drug_price_list_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `general_drug_price_lists` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "general_drug_price_list_items" DROP CONSTRAINT "general_drug_price_list_items_general_drug_id_fkey";

-- DropForeignKey
ALTER TABLE "general_drug_price_list_items" DROP CONSTRAINT "general_drug_price_list_items_general_drug_price_list_id_fkey";

-- DropForeignKey
ALTER TABLE "pharmacies" DROP CONSTRAINT "pharmacies_last_applied_general_drug_price_list_id_fkey";

-- DropIndex
DROP INDEX "general_drug_price_list_items_general_drug_id_idx";

-- DropIndex
DROP INDEX "general_drug_price_list_items_general_drug_price_list_id_genera";

-- DropIndex
DROP INDEX "general_drug_price_lists_published_at_idx";

-- DropIndex
DROP INDEX "pharmacies_last_applied_general_drug_price_list_id_idx";

-- AlterTable
ALTER TABLE "general_drug_price_list_items" DROP CONSTRAINT "general_drug_price_list_items_pkey",
DROP COLUMN "consumer_price",
DROP COLUMN "general_drug_id",
DROP COLUMN "general_drug_price_list_id",
DROP COLUMN "general_drug_price_list_item_id",
DROP COLUMN "net_price",
ADD COLUMN     "consumerPrice" DECIMAL(12,2),
ADD COLUMN     "generalDrugId" INTEGER NOT NULL,
ADD COLUMN     "generalDrugPriceListId" INTEGER NOT NULL,
ADD COLUMN     "generalDrugPriceListItemId" SERIAL NOT NULL,
ADD COLUMN     "netPrice" DECIMAL(12,2),
ADD CONSTRAINT "general_drug_price_list_items_pkey" PRIMARY KEY ("generalDrugPriceListItemId");

-- AlterTable
ALTER TABLE "general_drug_price_lists" DROP CONSTRAINT "general_drug_price_lists_pkey",
DROP COLUMN "general_drug_price_list_id",
DROP COLUMN "published_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "generalDrugPriceListId" SERIAL NOT NULL,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "general_drug_price_lists_pkey" PRIMARY KEY ("generalDrugPriceListId");

-- AlterTable
ALTER TABLE "pharmacies" DROP COLUMN "last_applied_general_drug_price_list_id",
ADD COLUMN     "lastAppliedGeneralDrugPriceListId" INTEGER;

-- CreateIndex
CREATE INDEX "general_drug_price_list_items_generalDrugId_idx" ON "general_drug_price_list_items"("generalDrugId");

-- CreateIndex
CREATE UNIQUE INDEX "general_drug_price_list_items_generalDrugPriceListId_genera_key" ON "general_drug_price_list_items"("generalDrugPriceListId", "generalDrugId");

-- CreateIndex
CREATE INDEX "general_drug_price_lists_publishedAt_idx" ON "general_drug_price_lists"("publishedAt");

-- CreateIndex
CREATE INDEX "pharmacies_lastAppliedGeneralDrugPriceListId_idx" ON "pharmacies"("lastAppliedGeneralDrugPriceListId");

-- AddForeignKey
ALTER TABLE "pharmacies" ADD CONSTRAINT "pharmacies_lastAppliedGeneralDrugPriceListId_fkey" FOREIGN KEY ("lastAppliedGeneralDrugPriceListId") REFERENCES "general_drug_price_lists"("generalDrugPriceListId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_drug_price_list_items" ADD CONSTRAINT "general_drug_price_list_items_generalDrugPriceListId_fkey" FOREIGN KEY ("generalDrugPriceListId") REFERENCES "general_drug_price_lists"("generalDrugPriceListId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_drug_price_list_items" ADD CONSTRAINT "general_drug_price_list_items_generalDrugId_fkey" FOREIGN KEY ("generalDrugId") REFERENCES "general_drugs"("general_drug_id") ON DELETE CASCADE ON UPDATE CASCADE;