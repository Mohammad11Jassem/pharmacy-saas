/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `user_accounts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `account_type` to the `user_accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `full_name` to the `user_accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password_hash` to the `user_accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `user_accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `user_accounts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ADMIN', 'PHARMACY_OWNER', 'MEDICAL_TEAM');

-- CreateEnum
CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "PharmacyStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PharmacyDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "user_accounts" ADD COLUMN     "account_type" "AccountType" NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "full_name" TEXT NOT NULL,
ADD COLUMN     "password_hash" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "status" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "pharmacy_owners" (
    "pharmacy_owner_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "national_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_owners_pkey" PRIMARY KEY ("pharmacy_owner_id")
);

-- CreateTable
CREATE TABLE "pharmacies" (
    "pharmacy_id" SERIAL NOT NULL,
    "pharmacy_owner_id" INTEGER NOT NULL,
    "pharmacist_license_no" TEXT,
    "pharmacy_name" TEXT NOT NULL,
    "pharmacy_code" TEXT NOT NULL,
    "contact_phone" TEXT,
    "email" TEXT,
    "governorate" TEXT,
    "health_directorate" TEXT,
    "area_name" TEXT,
    "address_text" TEXT,
    "status" "PharmacyStatus" NOT NULL DEFAULT 'PENDING',
    "opening_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacies_pkey" PRIMARY KEY ("pharmacy_id")
);

-- CreateTable
CREATE TABLE "pharmacy_credentials" (
    "pharmacy_credential_id" SERIAL NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "login_code" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "locked_until" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_credentials_pkey" PRIMARY KEY ("pharmacy_credential_id")
);

-- CreateTable
CREATE TABLE "pharmacy_documents" (
    "document_id" SERIAL NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "document_type_id" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "notes" TEXT,
    "status" "PharmacyDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_documents_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "pharmacy_document_types" (
    "document_type_id" SERIAL NOT NULL,
    "document_name_ar" TEXT NOT NULL,
    "issuing_authority" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_document_types_pkey" PRIMARY KEY ("document_type_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_owners_user_id_key" ON "pharmacy_owners"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_owners_national_id_key" ON "pharmacy_owners"("national_id");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacies_pharmacist_license_no_key" ON "pharmacies"("pharmacist_license_no");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacies_pharmacy_code_key" ON "pharmacies"("pharmacy_code");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacies_email_key" ON "pharmacies"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_credentials_pharmacy_id_key" ON "pharmacy_credentials"("pharmacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_credentials_login_code_key" ON "pharmacy_credentials"("login_code");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_phone_key" ON "user_accounts"("phone");

-- AddForeignKey
ALTER TABLE "pharmacy_owners" ADD CONSTRAINT "pharmacy_owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_accounts"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacies" ADD CONSTRAINT "pharmacies_pharmacy_owner_id_fkey" FOREIGN KEY ("pharmacy_owner_id") REFERENCES "pharmacy_owners"("pharmacy_owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_credentials" ADD CONSTRAINT "pharmacy_credentials_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("pharmacy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_documents" ADD CONSTRAINT "pharmacy_documents_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("pharmacy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_documents" ADD CONSTRAINT "pharmacy_documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "pharmacy_document_types"("document_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;
