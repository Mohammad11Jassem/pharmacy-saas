/*
  Warnings:

  - You are about to drop the column `damage_reason` on the `damage_invoice_items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "damage_invoice_items" DROP COLUMN "damage_reason";

-- AlterTable
ALTER TABLE "damage_invoices" ADD COLUMN     "damage_reason" TEXT;
