-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ADMIN', 'PHARMACY_OWNER', 'MEDICAL_TEAM');

-- CreateEnum
CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "PharmacyStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PharmacyDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "user_accounts" (
    "user_id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
<<<<<<<< HEAD:prisma/migrations/20260524091630_init/migration.sql
    "password_hash" TEXT,
    "account_type" "AccountType" NOT NULL,
    "status" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "login_code" TEXT NOT NULL,
========
    "password_hash" TEXT NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "status" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE',
>>>>>>>> d3ee7e36487591a0178216395eb3458d77f4bf2b:prisma/migrations/20260523101443_add_pharmacies_table/migration.sql
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("user_id")
);

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
    "password_hash" TEXT,
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
CREATE UNIQUE INDEX "user_accounts_email_key" ON "user_accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_phone_key" ON "user_accounts"("phone");

-- CreateIndex
<<<<<<<< HEAD:prisma/migrations/20260524091630_init/migration.sql
CREATE UNIQUE INDEX "user_accounts_login_code_key" ON "user_accounts"("login_code");

-- CreateIndex
========
>>>>>>>> d3ee7e36487591a0178216395eb3458d77f4bf2b:prisma/migrations/20260523101443_add_pharmacies_table/migration.sql
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
