-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ADMIN', 'PHARMACY_OWNER', 'MEDICAL_TEAM', 'PHARMACY');

-- CreateEnum
CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "PharmacyStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PharmacyDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DosageFormCategory" AS ENUM ('SOLID', 'LIQUID', 'SEMI_SOLID', 'INJECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "DrugSource" AS ENUM ('GENERAL', 'PRIVATE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderItemStatus" AS ENUM ('PENDING', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'DEPLETED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "SupplierInvoiceStatus" AS ENUM ('PENDING', 'PARTIALLY_STOCKED', 'STOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomerRequestStatus" AS ENUM ('PENDING', 'PARTIALLY_FULFILLED', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomerRequestItemStatus" AS ENUM ('PENDING', 'ORDERED', 'RESERVED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PharmacyInvoiceType" AS ENUM ('SALE', 'RETURN', 'DAMAGE');

-- CreateEnum
CREATE TYPE "PharmacyInvoiceStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('NORMAL', 'CUSTOMER_REQUEST');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('BOX', 'STRIP', 'TABLET');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('CUSTOMER_CHANGED_MIND', 'WRONG_ITEM', 'DAMAGED', 'EXPIRED', 'OTHER');

-- CreateEnum
CREATE TYPE "DamageReason" AS ENUM ('EXPIRED', 'BROKEN', 'DAMAGED_PACKAGING', 'STORAGE_ISSUE', 'CUSTOMER_RETURN_DAMAGED', 'MANUAL_ADJUSTMENT', 'OTHER');

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
    "pharmacy_code" TEXT,
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
CREATE TABLE "active_ingredients" (
    "ingredient_id" SERIAL NOT NULL,
    "ingredient_name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "active_ingredients_pkey" PRIMARY KEY ("ingredient_id")
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
CREATE TABLE "private_drug_ingredients" (
    "private_drug_ingredient_id" SERIAL NOT NULL,
    "private_drug_id" INTEGER NOT NULL,
    "ingredient_id" INTEGER NOT NULL,
    "strength_value" DECIMAL(65,30),
    "unit" TEXT,

    CONSTRAINT "private_drug_ingredients_pkey" PRIMARY KEY ("private_drug_ingredient_id")
);

-- CreateTable
CREATE TABLE "drug_category_assignments" (
    "unique_id" SERIAL NOT NULL,
    "general_drug_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_category_assignments_pkey" PRIMARY KEY ("unique_id")
);

-- CreateTable
CREATE TABLE "private_drug_category_assignments" (
    "unique_id" SERIAL NOT NULL,
    "private_drug_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "private_drug_category_assignments_pkey" PRIMARY KEY ("unique_id")
);

-- CreateTable
CREATE TABLE "drugs" (
    "drug_id" SERIAL NOT NULL,
    "source" "DrugSource" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drugs_pkey" PRIMARY KEY ("drug_id")
);

-- CreateTable
CREATE TABLE "general_drugs" (
    "general_drug_id" SERIAL NOT NULL,
    "drug_id" INTEGER NOT NULL,
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
CREATE TABLE "private_drugs" (
    "private_drug_id" SERIAL NOT NULL,
    "drug_id" INTEGER NOT NULL,
    "dosage_form_id" INTEGER NOT NULL,
    "tradeName" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "units_per_box" INTEGER NOT NULL,
    "is_rx" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "private_drugs_pkey" PRIMARY KEY ("private_drug_id")
);

-- CreateTable
CREATE TABLE "pharmacy_drugs" (
    "pharmacy_drug_id" SERIAL NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "drug_id" INTEGER NOT NULL,
    "min_stock_alert" INTEGER,
    "sell_part" BOOLEAN NOT NULL DEFAULT false,
    "net_price" DECIMAL(12,2),
    "consumer_price" DECIMAL(12,2),
    "expiry_date_alarm" INTEGER DEFAULT 60,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_drugs_pkey" PRIMARY KEY ("pharmacy_drug_id")
);

-- CreateTable
CREATE TABLE "drug_locations" (
    "drug_location_id" SERIAL NOT NULL,
    "pharmacy_drug_id" INTEGER NOT NULL,
    "storage_location" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_locations_pkey" PRIMARY KEY ("drug_location_id")
);

-- CreateTable
CREATE TABLE "batches" (
    "batch_id" SERIAL NOT NULL,
    "pharmacy_drug_id" INTEGER NOT NULL,
    "supplier_invoice_item_id" INTEGER,
    "expiry_date" DATE,
    "initial_quantity" INTEGER NOT NULL,
    "sold_quantity" INTEGER NOT NULL DEFAULT 0,
    "received_date" DATE,
    "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("batch_id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "supplier_id" SERIAL NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("supplier_id")
);

-- CreateTable
CREATE TABLE "supplier_invoices" (
    "supplier_invoice_id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "invoice_number" TEXT,
    "invoice_date" DATE NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_price" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "status" "SupplierInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_invoices_pkey" PRIMARY KEY ("supplier_invoice_id")
);

-- CreateTable
CREATE TABLE "supplier_invoice_items" (
    "supplier_invoice_item_id" SERIAL NOT NULL,
    "supplier_invoice_id" INTEGER NOT NULL,
    "pharmacy_drug_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "net_unit_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_invoice_items_pkey" PRIMARY KEY ("supplier_invoice_item_id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "purchase_order_id" SERIAL NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "order_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "order_status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("purchase_order_id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "purchase_order_item_id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "pharmacy_drug_id" INTEGER NOT NULL,
    "ordered_quantity_boxes" INTEGER NOT NULL,
    "status" "PurchaseOrderItemStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("purchase_order_item_id")
);

-- CreateTable
CREATE TABLE "CustomerRequest" (
    "customerRequestId" SERIAL NOT NULL,
    "pharmacyId" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "notes" TEXT,
    "status" "CustomerRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerRequest_pkey" PRIMARY KEY ("customerRequestId")
);

-- CreateTable
CREATE TABLE "CustomerRequestItem" (
    "customerRequestItemId" SERIAL NOT NULL,
    "customerRequestId" INTEGER NOT NULL,
    "pharmacyDrugId" INTEGER NOT NULL,
    "requestedQuantity" INTEGER NOT NULL,
    "fulfilledQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "CustomerRequestItemStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerRequestItem_pkey" PRIMARY KEY ("customerRequestItemId")
);

-- CreateTable
CREATE TABLE "patients" (
    "patient_id" SERIAL NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "full_name" TEXT NOT NULL,
    "national_id" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("patient_id")
);

-- CreateTable
CREATE TABLE "pharmacy_invoices" (
    "pharmacy_invoice_id" SERIAL NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "patient_id" INTEGER,
    "invoice_type" "PharmacyInvoiceType" NOT NULL,
    "invoice_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PharmacyInvoiceStatus" NOT NULL DEFAULT 'POSTED',
    "notes" TEXT,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_invoices_pkey" PRIMARY KEY ("pharmacy_invoice_id")
);

-- CreateTable
CREATE TABLE "sale_invoices" (
    "sale_invoice_id" SERIAL NOT NULL,
    "pharmacy_invoice_id" INTEGER NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "sale_type" "SaleType" NOT NULL DEFAULT 'NORMAL',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_invoices_pkey" PRIMARY KEY ("sale_invoice_id")
);

-- CreateTable
CREATE TABLE "sale_invoice_items" (
    "sale_invoice_item_id" SERIAL NOT NULL,
    "sale_invoice_id" INTEGER NOT NULL,
    "pharmacy_drug_id" INTEGER NOT NULL,
    "unit_type" "UnitType" NOT NULL,
    "base_quantity" INTEGER NOT NULL,
    "unit_factor_to_base" INTEGER NOT NULL,
    "base_unit_price" DECIMAL(12,2) NOT NULL,
    "extra_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "final_unit_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_invoice_items_pkey" PRIMARY KEY ("sale_invoice_item_id")
);

-- CreateTable
CREATE TABLE "sale_invoice_item_batches" (
    "sale_invoice_item_batch_id" SERIAL NOT NULL,
    "sale_invoice_item_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "base_quantity" INTEGER NOT NULL,
    "unit_cost_at_sale" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_invoice_item_batches_pkey" PRIMARY KEY ("sale_invoice_item_batch_id")
);

-- CreateTable
CREATE TABLE "return_invoices" (
    "return_invoice_id" SERIAL NOT NULL,
    "pharmacy_invoice_id" INTEGER NOT NULL,
    "reference_sale_invoice_id" INTEGER,
    "subtotal_refund" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_invoices_pkey" PRIMARY KEY ("return_invoice_id")
);

-- CreateTable
CREATE TABLE "return_invoice_items" (
    "return_invoice_item_id" SERIAL NOT NULL,
    "return_invoice_id" INTEGER NOT NULL,
    "pharmacy_drug_id" INTEGER NOT NULL,
    "sale_invoice_item_batch_id" INTEGER NOT NULL,
    "unit_type" "UnitType" NOT NULL,
    "base_quantity" INTEGER NOT NULL,
    "unit_factor_to_base" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "return_reason" "ReturnReason",
    "restock_to_inventory" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_invoice_items_pkey" PRIMARY KEY ("return_invoice_item_id")
);

-- CreateTable
CREATE TABLE "damage_invoices" (
    "damage_invoice_id" SERIAL NOT NULL,
    "pharmacy_invoice_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "damage_invoices_pkey" PRIMARY KEY ("damage_invoice_id")
);

-- CreateTable
CREATE TABLE "damage_invoice_items" (
    "damage_invoice_item_id" SERIAL NOT NULL,
    "damage_invoice_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "quantity_damaged" INTEGER NOT NULL,
    "damage_reason" "DamageReason" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "damage_invoice_items_pkey" PRIMARY KEY ("damage_invoice_item_id")
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
CREATE UNIQUE INDEX "dosage_forms_dosage_form_name_key" ON "dosage_forms"("dosage_form_name");

-- CreateIndex
CREATE UNIQUE INDEX "drug_categories_category_name_key" ON "drug_categories"("category_name");

-- CreateIndex
CREATE UNIQUE INDEX "active_ingredients_ingredient_name_key" ON "active_ingredients"("ingredient_name");

-- CreateIndex
CREATE UNIQUE INDEX "drug_ingredients_general_drug_id_ingredient_id_unit_key" ON "drug_ingredients"("general_drug_id", "ingredient_id", "unit");

-- CreateIndex
CREATE INDEX "private_drug_ingredients_private_drug_id_idx" ON "private_drug_ingredients"("private_drug_id");

-- CreateIndex
CREATE INDEX "private_drug_ingredients_ingredient_id_idx" ON "private_drug_ingredients"("ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "private_drug_ingredients_private_drug_id_ingredient_id_key" ON "private_drug_ingredients"("private_drug_id", "ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "drug_category_assignments_general_drug_id_category_id_key" ON "drug_category_assignments"("general_drug_id", "category_id");

-- CreateIndex
CREATE INDEX "private_drug_category_assignments_private_drug_id_idx" ON "private_drug_category_assignments"("private_drug_id");

-- CreateIndex
CREATE INDEX "private_drug_category_assignments_category_id_idx" ON "private_drug_category_assignments"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "private_drug_category_assignments_private_drug_id_category__key" ON "private_drug_category_assignments"("private_drug_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "general_drugs_drug_id_key" ON "general_drugs"("drug_id");

-- CreateIndex
CREATE UNIQUE INDEX "general_drugs_barcode_key" ON "general_drugs"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "private_drugs_drug_id_key" ON "private_drugs"("drug_id");

-- CreateIndex
CREATE UNIQUE INDEX "private_drugs_barcode_key" ON "private_drugs"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_drugs_pharmacy_id_drug_id_key" ON "pharmacy_drugs"("pharmacy_id", "drug_id");

-- CreateIndex
CREATE INDEX "batches_pharmacy_drug_id_idx" ON "batches"("pharmacy_drug_id");

-- CreateIndex
CREATE INDEX "batches_supplier_invoice_item_id_idx" ON "batches"("supplier_invoice_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_invoices_invoice_number_key" ON "supplier_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "CustomerRequest_pharmacyId_idx" ON "CustomerRequest"("pharmacyId");

-- CreateIndex
CREATE INDEX "CustomerRequest_status_idx" ON "CustomerRequest"("status");

-- CreateIndex
CREATE INDEX "CustomerRequest_customerPhone_idx" ON "CustomerRequest"("customerPhone");

-- CreateIndex
CREATE INDEX "CustomerRequestItem_customerRequestId_idx" ON "CustomerRequestItem"("customerRequestId");

-- CreateIndex
CREATE INDEX "CustomerRequestItem_pharmacyDrugId_idx" ON "CustomerRequestItem"("pharmacyDrugId");

-- CreateIndex
CREATE INDEX "CustomerRequestItem_status_idx" ON "CustomerRequestItem"("status");

-- CreateIndex
CREATE INDEX "patients_pharmacy_id_idx" ON "patients"("pharmacy_id");

-- CreateIndex
CREATE INDEX "patients_phone_idx" ON "patients"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "patients_pharmacy_id_phone_key" ON "patients"("pharmacy_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "patients_pharmacy_id_national_id_key" ON "patients"("pharmacy_id", "national_id");

-- CreateIndex
CREATE INDEX "pharmacy_invoices_pharmacy_id_idx" ON "pharmacy_invoices"("pharmacy_id");

-- CreateIndex
CREATE INDEX "pharmacy_invoices_patient_id_idx" ON "pharmacy_invoices"("patient_id");

-- CreateIndex
CREATE INDEX "pharmacy_invoices_invoice_type_idx" ON "pharmacy_invoices"("invoice_type");

-- CreateIndex
CREATE INDEX "pharmacy_invoices_invoice_date_idx" ON "pharmacy_invoices"("invoice_date");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_invoices_pharmacy_id_invoice_type_idempotency_key_key" ON "pharmacy_invoices"("pharmacy_id", "invoice_type", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "sale_invoices_pharmacy_invoice_id_key" ON "sale_invoices"("pharmacy_invoice_id");

-- CreateIndex
CREATE INDEX "sale_invoice_items_sale_invoice_id_idx" ON "sale_invoice_items"("sale_invoice_id");

-- CreateIndex
CREATE INDEX "sale_invoice_items_pharmacy_drug_id_idx" ON "sale_invoice_items"("pharmacy_drug_id");

-- CreateIndex
CREATE INDEX "sale_invoice_item_batches_sale_invoice_item_id_idx" ON "sale_invoice_item_batches"("sale_invoice_item_id");

-- CreateIndex
CREATE INDEX "sale_invoice_item_batches_batch_id_idx" ON "sale_invoice_item_batches"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "return_invoices_pharmacy_invoice_id_key" ON "return_invoices"("pharmacy_invoice_id");

-- CreateIndex
CREATE INDEX "return_invoices_reference_sale_invoice_id_idx" ON "return_invoices"("reference_sale_invoice_id");

-- CreateIndex
CREATE INDEX "return_invoice_items_return_invoice_id_idx" ON "return_invoice_items"("return_invoice_id");

-- CreateIndex
CREATE INDEX "return_invoice_items_pharmacy_drug_id_idx" ON "return_invoice_items"("pharmacy_drug_id");

-- CreateIndex
CREATE INDEX "return_invoice_items_sale_invoice_item_batch_id_idx" ON "return_invoice_items"("sale_invoice_item_batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "damage_invoices_pharmacy_invoice_id_key" ON "damage_invoices"("pharmacy_invoice_id");

-- CreateIndex
CREATE INDEX "damage_invoice_items_damage_invoice_id_idx" ON "damage_invoice_items"("damage_invoice_id");

-- CreateIndex
CREATE INDEX "damage_invoice_items_batch_id_idx" ON "damage_invoice_items"("batch_id");

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
ALTER TABLE "drug_ingredients" ADD CONSTRAINT "drug_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "active_ingredients"("ingredient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_ingredients" ADD CONSTRAINT "drug_ingredients_general_drug_id_fkey" FOREIGN KEY ("general_drug_id") REFERENCES "general_drugs"("general_drug_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_drug_ingredients" ADD CONSTRAINT "private_drug_ingredients_private_drug_id_fkey" FOREIGN KEY ("private_drug_id") REFERENCES "private_drugs"("private_drug_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_drug_ingredients" ADD CONSTRAINT "private_drug_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "active_ingredients"("ingredient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_category_assignments" ADD CONSTRAINT "drug_category_assignments_general_drug_id_fkey" FOREIGN KEY ("general_drug_id") REFERENCES "general_drugs"("general_drug_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_category_assignments" ADD CONSTRAINT "drug_category_assignments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "drug_categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_drug_category_assignments" ADD CONSTRAINT "private_drug_category_assignments_private_drug_id_fkey" FOREIGN KEY ("private_drug_id") REFERENCES "private_drugs"("private_drug_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_drug_category_assignments" ADD CONSTRAINT "private_drug_category_assignments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "drug_categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_drugs" ADD CONSTRAINT "general_drugs_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("drug_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_drugs" ADD CONSTRAINT "general_drugs_dosage_form_id_fkey" FOREIGN KEY ("dosage_form_id") REFERENCES "dosage_forms"("dosage_form_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_drugs" ADD CONSTRAINT "private_drugs_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("drug_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_drugs" ADD CONSTRAINT "private_drugs_dosage_form_id_fkey" FOREIGN KEY ("dosage_form_id") REFERENCES "dosage_forms"("dosage_form_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_drugs" ADD CONSTRAINT "pharmacy_drugs_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("pharmacy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_drugs" ADD CONSTRAINT "pharmacy_drugs_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("drug_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_locations" ADD CONSTRAINT "drug_locations_pharmacy_drug_id_fkey" FOREIGN KEY ("pharmacy_drug_id") REFERENCES "pharmacy_drugs"("pharmacy_drug_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_pharmacy_drug_id_fkey" FOREIGN KEY ("pharmacy_drug_id") REFERENCES "pharmacy_drugs"("pharmacy_drug_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_supplier_invoice_item_id_fkey" FOREIGN KEY ("supplier_invoice_item_id") REFERENCES "supplier_invoice_items"("supplier_invoice_item_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("pharmacy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoice_items" ADD CONSTRAINT "supplier_invoice_items_supplier_invoice_id_fkey" FOREIGN KEY ("supplier_invoice_id") REFERENCES "supplier_invoices"("supplier_invoice_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoice_items" ADD CONSTRAINT "supplier_invoice_items_pharmacy_drug_id_fkey" FOREIGN KEY ("pharmacy_drug_id") REFERENCES "pharmacy_drugs"("pharmacy_drug_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("pharmacy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("purchase_order_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_pharmacy_drug_id_fkey" FOREIGN KEY ("pharmacy_drug_id") REFERENCES "pharmacy_drugs"("pharmacy_drug_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("pharmacy_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequestItem" ADD CONSTRAINT "CustomerRequestItem_customerRequestId_fkey" FOREIGN KEY ("customerRequestId") REFERENCES "CustomerRequest"("customerRequestId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequestItem" ADD CONSTRAINT "CustomerRequestItem_pharmacyDrugId_fkey" FOREIGN KEY ("pharmacyDrugId") REFERENCES "pharmacy_drugs"("pharmacy_drug_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("pharmacy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_invoices" ADD CONSTRAINT "pharmacy_invoices_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("pharmacy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_invoices" ADD CONSTRAINT "pharmacy_invoices_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_invoices" ADD CONSTRAINT "sale_invoices_pharmacy_invoice_id_fkey" FOREIGN KEY ("pharmacy_invoice_id") REFERENCES "pharmacy_invoices"("pharmacy_invoice_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_invoice_items" ADD CONSTRAINT "sale_invoice_items_sale_invoice_id_fkey" FOREIGN KEY ("sale_invoice_id") REFERENCES "sale_invoices"("sale_invoice_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_invoice_items" ADD CONSTRAINT "sale_invoice_items_pharmacy_drug_id_fkey" FOREIGN KEY ("pharmacy_drug_id") REFERENCES "pharmacy_drugs"("pharmacy_drug_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_invoice_item_batches" ADD CONSTRAINT "sale_invoice_item_batches_sale_invoice_item_id_fkey" FOREIGN KEY ("sale_invoice_item_id") REFERENCES "sale_invoice_items"("sale_invoice_item_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_invoice_item_batches" ADD CONSTRAINT "sale_invoice_item_batches_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("batch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_invoices" ADD CONSTRAINT "return_invoices_pharmacy_invoice_id_fkey" FOREIGN KEY ("pharmacy_invoice_id") REFERENCES "pharmacy_invoices"("pharmacy_invoice_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_invoices" ADD CONSTRAINT "return_invoices_reference_sale_invoice_id_fkey" FOREIGN KEY ("reference_sale_invoice_id") REFERENCES "sale_invoices"("sale_invoice_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_invoice_items" ADD CONSTRAINT "return_invoice_items_return_invoice_id_fkey" FOREIGN KEY ("return_invoice_id") REFERENCES "return_invoices"("return_invoice_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_invoice_items" ADD CONSTRAINT "return_invoice_items_pharmacy_drug_id_fkey" FOREIGN KEY ("pharmacy_drug_id") REFERENCES "pharmacy_drugs"("pharmacy_drug_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_invoice_items" ADD CONSTRAINT "return_invoice_items_sale_invoice_item_batch_id_fkey" FOREIGN KEY ("sale_invoice_item_batch_id") REFERENCES "sale_invoice_item_batches"("sale_invoice_item_batch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_invoices" ADD CONSTRAINT "damage_invoices_pharmacy_invoice_id_fkey" FOREIGN KEY ("pharmacy_invoice_id") REFERENCES "pharmacy_invoices"("pharmacy_invoice_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_invoice_items" ADD CONSTRAINT "damage_invoice_items_damage_invoice_id_fkey" FOREIGN KEY ("damage_invoice_id") REFERENCES "damage_invoices"("damage_invoice_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_invoice_items" ADD CONSTRAINT "damage_invoice_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("batch_id") ON DELETE RESTRICT ON UPDATE CASCADE;
