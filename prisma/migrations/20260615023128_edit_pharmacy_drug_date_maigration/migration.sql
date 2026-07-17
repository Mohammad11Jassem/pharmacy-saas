/*
  Warnings:

  - The `expiry_date_alarm` column on the `pharmacy_drugs` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "pharmacy_drugs" DROP COLUMN "expiry_date_alarm",
ADD COLUMN     "expiry_date_alarm" INTEGER DEFAULT 60;
