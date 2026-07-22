-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ADMIN', 'PHARMACY_OWNER', 'MEDICAL_TEAM');

-- CreateEnum
CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "PharmacyStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PharmacyDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DosageFormCategory" AS ENUM ('SOLID', 'LIQUID', 'SEMI_SOLID', 'INJECTION', 'OTHER');

-- CreateTable
CREATE TABLE "user_accounts" (
    "user_id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password_hash" TEXT,
    "account_type" "AccountType" NOT NULL,
    "status" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "login_code" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "active_ingredients" (
    "ingredient_id" SERIAL NOT NULL,
    "ingredient_name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "active_ingredients_pkey" PRIMARY KEY ("ingredient_id")
);

-- CreateTable
CREATE TABLE "dosage_forms" (
    "dosage_form_id" SERIAL NOT NULL,
    "dosage_form_name" TEXT NOT NULL,
    "form_category" "DosageFormCategory" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dosage_forms_pkey" PRIMARY KEY ("dosage_form_id")
);

-- CreateTable
CREATE TABLE "drug_categories" (
    "category_id" SERIAL NOT NULL,
    "category_name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "general_drugs" (
    "general_drug_id" SERIAL NOT NULL,
    "dosage_form_id" INTEGER NOT NULL,
    "trade_name" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "units_per_box" INTEGER NOT NULL,
    "net_price" DECIMAL(12,2) NOT NULL,
    "consumer_price" DECIMAL(12,2) NOT NULL,
    "is_rx" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "general_drugs_pkey" PRIMARY KEY ("general_drug_id")
);

-- CreateTable
CREATE TABLE "drug_ingredients" (
    "drug_ingredient_id" SERIAL NOT NULL,
    "ingredient_id" INTEGER NOT NULL,
    "general_drug_id" INTEGER NOT NULL,
    "strength_value" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_ingredients_pkey" PRIMARY KEY ("drug_ingredient_id")
);

-- CreateTable
CREATE TABLE "drug_category_assignments" (
    "unique_id" SERIAL NOT NULL,
    "general_drug_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_category_assignments_pkey" PRIMARY KEY ("unique_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_email_key" ON "user_accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_phone_key" ON "user_accounts"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_login_code_key" ON "user_accounts"("login_code");

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
CREATE UNIQUE INDEX "active_ingredients_ingredient_name_key" ON "active_ingredients"("ingredient_name");

-- CreateIndex
CREATE UNIQUE INDEX "dosage_forms_dosage_form_name_key" ON "dosage_forms"("dosage_form_name");

-- CreateIndex
CREATE UNIQUE INDEX "drug_categories_category_name_key" ON "drug_categories"("category_name");

-- CreateIndex
CREATE UNIQUE INDEX "general_drugs_barcode_key" ON "general_drugs"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "drug_ingredients_general_drug_id_ingredient_id_unit_key" ON "drug_ingredients"("general_drug_id", "ingredient_id", "unit");

-- CreateIndex
CREATE UNIQUE INDEX "drug_category_assignments_general_drug_id_category_id_key" ON "drug_category_assignments"("general_drug_id", "category_id");

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

-- AddForeignKey
ALTER TABLE "general_drugs" ADD CONSTRAINT "general_drugs_dosage_form_id_fkey" FOREIGN KEY ("dosage_form_id") REFERENCES "dosage_forms"("dosage_form_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_ingredients" ADD CONSTRAINT "drug_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "active_ingredients"("ingredient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_ingredients" ADD CONSTRAINT "drug_ingredients_general_drug_id_fkey" FOREIGN KEY ("general_drug_id") REFERENCES "general_drugs"("general_drug_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_category_assignments" ADD CONSTRAINT "drug_category_assignments_general_drug_id_fkey" FOREIGN KEY ("general_drug_id") REFERENCES "general_drugs"("general_drug_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_category_assignments" ADD CONSTRAINT "drug_category_assignments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "drug_categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;
