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

-- CreateEnum
CREATE TYPE "SubscriptionPlanType" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionPlanStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OfferScope" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "PharmacySubscriptionStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RagMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "RagRequestStatus" AS ENUM ('PROCESSING', 'SUCCEEDED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "outbox_event_status" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED');

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
    "customer_request_id" INTEGER,
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
    "customer_request_item_id" INTEGER,
    "unit_type" "UnitType" NOT NULL,
    "base_quantity" INTEGER NOT NULL,
    "unit_factor_to_base" INTEGER NOT NULL,
    "base_unit_price" DECIMAL(12,2) NOT NULL,
    "extra_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "final_unit_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) DEFAULT 0,
    "net_total_price" DECIMAL(12,2),
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
    "invoice_number" TEXT,
    "damage_reason" TEXT,
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
    "unit_consumer_price" DECIMAL(12,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "damage_invoice_items_pkey" PRIMARY KEY ("damage_invoice_item_id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "plan_id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_months" INTEGER NOT NULL,
    "plan_price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SP',
    "type" "SubscriptionPlanType" NOT NULL,
    "status" "SubscriptionPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "rag_enabled" BOOLEAN NOT NULL DEFAULT false,
    "rag_max_completed_turns_per_conversation" INTEGER,
    "rag_monthly_request_limit" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("plan_id")
);

-- CreateTable
CREATE TABLE "plan_offers" (
    "offer_id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scope" "OfferScope" NOT NULL,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_offers_pkey" PRIMARY KEY ("offer_id")
);

-- CreateTable
CREATE TABLE "pharmacy_offer_grants" (
    "pharmacy_offer_grant_id" SERIAL NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "offer_id" INTEGER NOT NULL,
    "grant_reason" TEXT,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "redeemed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_offer_grants_pkey" PRIMARY KEY ("pharmacy_offer_grant_id")
);

-- CreateTable
CREATE TABLE "pharmacy_subscriptions" (
    "pharmacy_subscription_id" SERIAL NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "status" "PharmacySubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "base_price" DECIMAL(12,2) NOT NULL,
    "final_price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SP',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_subscriptions_pkey" PRIMARY KEY ("pharmacy_subscription_id")
);

-- CreateTable
CREATE TABLE "subscription_applied_offers" (
    "applied_offer_id" SERIAL NOT NULL,
    "pharmacy_subscription_id" INTEGER NOT NULL,
    "offer_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_applied_offers_pkey" PRIMARY KEY ("applied_offer_id")
);

-- CreateTable
CREATE TABLE "rag_conversations" (
    "rag_conversation_id" SERIAL NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "title" VARCHAR(150) NOT NULL DEFAULT 'New conversation',
    "last_message_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_conversations_pkey" PRIMARY KEY ("rag_conversation_id")
);

-- CreateTable
CREATE TABLE "rag_messages" (
    "rag_message_id" SERIAL NOT NULL,
    "rag_request_id" INTEGER NOT NULL,
    "role" "RagMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rag_messages_pkey" PRIMARY KEY ("rag_message_id")
);

-- CreateTable
CREATE TABLE "rag_requests" (
    "rag_request_id" SERIAL NOT NULL,
    "pharmacy_subscription_id" INTEGER NOT NULL,
    "rag_conversation_id" INTEGER NOT NULL,
    "turn_number" INTEGER NOT NULL,
    "client_request_id" UUID NOT NULL,
    "status" "RagRequestStatus" NOT NULL DEFAULT 'PROCESSING',
    "lease_expires_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "failure_code" VARCHAR(100),
    "summary_updated" BOOLEAN NOT NULL DEFAULT false,
    "latency_ms" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_requests_pkey" PRIMARY KEY ("rag_request_id")
);

-- CreateTable
CREATE TABLE "rag_usage_daily" (
    "rag_usage_daily_id" SERIAL NOT NULL,
    "pharmacy_subscription_id" INTEGER NOT NULL,
    "usage_date" DATE NOT NULL,
    "usage_period_start" TIMESTAMP(3) NOT NULL,
    "usage_period_end" TIMESTAMP(3) NOT NULL,
    "successful_requests" INTEGER NOT NULL DEFAULT 0,
    "failed_requests" INTEGER NOT NULL DEFAULT 0,
    "expired_requests" INTEGER NOT NULL DEFAULT 0,
    "summary_updates" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_usage_daily_pkey" PRIMARY KEY ("rag_usage_daily_id")
);

-- CreateTable
CREATE TABLE "rag_conversation_memories" (
    "rag_conversation_memory_id" SERIAL NOT NULL,
    "rag_conversation_id" INTEGER NOT NULL,
    "summary_text" TEXT NOT NULL,
    "structured_state" JSONB,
    "summarized_until_turn" INTEGER NOT NULL DEFAULT 0,
    "memory_schema_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_conversation_memories_pkey" PRIMARY KEY ("rag_conversation_memory_id")
);

-- CreateTable
CREATE TABLE "rag_message_citations" (
    "rag_message_citation_id" SERIAL NOT NULL,
    "rag_message_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,
    "document_id" VARCHAR(255),
    "chunk_id" VARCHAR(255),
    "title" VARCHAR(255),
    "page" INTEGER,
    "snippet" TEXT,
    "score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rag_message_citations_pkey" PRIMARY KEY ("rag_message_citation_id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "outbox_event_id" SERIAL NOT NULL,
    "aggregate_type" VARCHAR(50) NOT NULL,
    "aggregate_id" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "outbox_event_status" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("outbox_event_id")
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
CREATE INDEX "sale_invoices_customer_request_id_idx" ON "sale_invoices"("customer_request_id");

-- CreateIndex
CREATE INDEX "sale_invoice_items_customer_request_item_id_idx" ON "sale_invoice_items"("customer_request_item_id");

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
CREATE UNIQUE INDEX "damage_invoices_invoice_number_key" ON "damage_invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "damage_invoices_pharmacy_invoice_id_key" ON "damage_invoices"("pharmacy_invoice_id");

-- CreateIndex
CREATE INDEX "damage_invoice_items_damage_invoice_id_idx" ON "damage_invoice_items"("damage_invoice_id");

-- CreateIndex
CREATE INDEX "damage_invoice_items_batch_id_idx" ON "damage_invoice_items"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE INDEX "subscription_plans_status_idx" ON "subscription_plans"("status");

-- CreateIndex
CREATE UNIQUE INDEX "plan_offers_code_key" ON "plan_offers"("code");

-- CreateIndex
CREATE INDEX "plan_offers_plan_id_idx" ON "plan_offers"("plan_id");

-- CreateIndex
CREATE INDEX "plan_offers_scope_is_active_starts_at_ends_at_idx" ON "plan_offers"("scope", "is_active", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "pharmacy_offer_grants_pharmacy_id_valid_from_valid_until_idx" ON "pharmacy_offer_grants"("pharmacy_id", "valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "pharmacy_offer_grants_offer_id_idx" ON "pharmacy_offer_grants"("offer_id");

-- CreateIndex
CREATE INDEX "pharmacy_offer_grants_redeemed_at_idx" ON "pharmacy_offer_grants"("redeemed_at");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_offer_grants_pharmacy_id_offer_id_key" ON "pharmacy_offer_grants"("pharmacy_id", "offer_id");

-- CreateIndex
CREATE INDEX "pharmacy_subscriptions_pharmacy_id_starts_at_ends_at_idx" ON "pharmacy_subscriptions"("pharmacy_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "pharmacy_subscriptions_pharmacy_id_status_idx" ON "pharmacy_subscriptions"("pharmacy_id", "status");

-- CreateIndex
CREATE INDEX "pharmacy_subscriptions_plan_id_idx" ON "pharmacy_subscriptions"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_applied_offers_pharmacy_subscription_id_key" ON "subscription_applied_offers"("pharmacy_subscription_id");

-- CreateIndex
CREATE INDEX "subscription_applied_offers_offer_id_idx" ON "subscription_applied_offers"("offer_id");

-- CreateIndex
CREATE INDEX "rag_conversations_pharmacy_id_archived_at_last_message_at_idx" ON "rag_conversations"("pharmacy_id", "archived_at", "last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "rag_messages_rag_request_id_role_key" ON "rag_messages"("rag_request_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "uq_rag_requests_client_request_id" ON "rag_requests"("client_request_id");

-- CreateIndex
CREATE INDEX "rag_requests_pharmacy_subscription_id_status_started_at_idx" ON "rag_requests"("pharmacy_subscription_id", "status", "started_at");

-- CreateIndex
CREATE INDEX "rag_requests_rag_conversation_id_status_lease_expires_at_idx" ON "rag_requests"("rag_conversation_id", "status", "lease_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "rag_requests_rag_conversation_id_client_request_id_key" ON "rag_requests"("rag_conversation_id", "client_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "rag_requests_rag_conversation_id_turn_number_key" ON "rag_requests"("rag_conversation_id", "turn_number");

-- CreateIndex
CREATE INDEX "rag_usage_daily_pharmacy_subscription_id_usage_period_start_idx" ON "rag_usage_daily"("pharmacy_subscription_id", "usage_period_start", "usage_period_end");

-- CreateIndex
CREATE UNIQUE INDEX "rag_usage_daily_subscription_date_period_key" ON "rag_usage_daily"("pharmacy_subscription_id", "usage_date", "usage_period_start");

-- CreateIndex
CREATE UNIQUE INDEX "rag_conversation_memories_rag_conversation_id_key" ON "rag_conversation_memories"("rag_conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "rag_message_citations_rag_message_id_position_key" ON "rag_message_citations"("rag_message_id", "position");

-- CreateIndex
CREATE INDEX "idx_outbox_events_dispatch" ON "outbox_events"("status", "available_at", "created_at");

-- CreateIndex
CREATE INDEX "idx_outbox_events_locked" ON "outbox_events"("status", "locked_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_outbox_events_type_aggregate" ON "outbox_events"("event_type", "aggregate_id");

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
ALTER TABLE "sale_invoices" ADD CONSTRAINT "sale_invoices_customer_request_id_fkey" FOREIGN KEY ("customer_request_id") REFERENCES "CustomerRequest"("customerRequestId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_invoice_items" ADD CONSTRAINT "sale_invoice_items_sale_invoice_id_fkey" FOREIGN KEY ("sale_invoice_id") REFERENCES "sale_invoices"("sale_invoice_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_invoice_items" ADD CONSTRAINT "sale_invoice_items_pharmacy_drug_id_fkey" FOREIGN KEY ("pharmacy_drug_id") REFERENCES "pharmacy_drugs"("pharmacy_drug_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_invoice_items" ADD CONSTRAINT "sale_invoice_items_customer_request_item_id_fkey" FOREIGN KEY ("customer_request_item_id") REFERENCES "CustomerRequestItem"("customerRequestItemId") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "plan_offers" ADD CONSTRAINT "plan_offers_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("plan_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_offer_grants" ADD CONSTRAINT "pharmacy_offer_grants_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("pharmacy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_offer_grants" ADD CONSTRAINT "pharmacy_offer_grants_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "plan_offers"("offer_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_subscriptions" ADD CONSTRAINT "pharmacy_subscriptions_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("pharmacy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_subscriptions" ADD CONSTRAINT "pharmacy_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("plan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_applied_offers" ADD CONSTRAINT "subscription_applied_offers_pharmacy_subscription_id_fkey" FOREIGN KEY ("pharmacy_subscription_id") REFERENCES "pharmacy_subscriptions"("pharmacy_subscription_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_applied_offers" ADD CONSTRAINT "subscription_applied_offers_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "plan_offers"("offer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_conversations" ADD CONSTRAINT "rag_conversations_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("pharmacy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_messages" ADD CONSTRAINT "rag_messages_rag_request_id_fkey" FOREIGN KEY ("rag_request_id") REFERENCES "rag_requests"("rag_request_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_requests" ADD CONSTRAINT "rag_requests_pharmacy_subscription_id_fkey" FOREIGN KEY ("pharmacy_subscription_id") REFERENCES "pharmacy_subscriptions"("pharmacy_subscription_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_requests" ADD CONSTRAINT "rag_requests_rag_conversation_id_fkey" FOREIGN KEY ("rag_conversation_id") REFERENCES "rag_conversations"("rag_conversation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_usage_daily" ADD CONSTRAINT "rag_usage_daily_pharmacy_subscription_id_fkey" FOREIGN KEY ("pharmacy_subscription_id") REFERENCES "pharmacy_subscriptions"("pharmacy_subscription_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_conversation_memories" ADD CONSTRAINT "rag_conversation_memories_rag_conversation_id_fkey" FOREIGN KEY ("rag_conversation_id") REFERENCES "rag_conversations"("rag_conversation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_message_citations" ADD CONSTRAINT "rag_message_citations_rag_message_id_fkey" FOREIGN KEY ("rag_message_id") REFERENCES "rag_messages"("rag_message_id") ON DELETE CASCADE ON UPDATE CASCADE;
