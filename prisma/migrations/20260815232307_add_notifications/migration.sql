/*
  Warnings:

  - A unique constraint covering the columns `[fcm_token]` on the table `pharmacies` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[fcm_token]` on the table `user_accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "NotificationRecipientType" AS ENUM ('PHARMACY', 'PHARMACY_OWNER');

-- AlterTable
ALTER TABLE "pharmacies" ADD COLUMN     "fcm_token" TEXT;

-- AlterTable
ALTER TABLE "user_accounts" ADD COLUMN     "fcm_token" TEXT;

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recipient_type" "NotificationRecipientType" NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateIndex
CREATE INDEX "notifications_recipient_type_recipient_id_created_at_idx" ON "notifications"("recipient_type", "recipient_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacies_fcm_token_key" ON "pharmacies"("fcm_token");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_fcm_token_key" ON "user_accounts"("fcm_token");
