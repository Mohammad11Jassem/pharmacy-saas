/*
  Warnings:

  - A unique constraint covering the columns `[drug_id]` on the table `general_drugs` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `drug_id` to the `general_drugs` table without a default value. This is not possible if the table is not empty.

*/
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
CREATE TYPE "SupplierInvoiceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "AccountType" ADD VALUE 'PHARMACY';

-- AlterTable
ALTER TABLE "general_drugs" ADD COLUMN     "drug_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "drugs" (
    "drug_id" SERIAL NOT NULL,
    "source" "DrugSource" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drugs_pkey" PRIMARY KEY ("drug_id")
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
    "expiry_date_alarm" DATE,
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

-- CreateIndex
CREATE UNIQUE INDEX "private_drugs_drug_id_key" ON "private_drugs"("drug_id");

-- CreateIndex
CREATE UNIQUE INDEX "private_drugs_barcode_key" ON "private_drugs"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_drugs_pharmacy_id_drug_id_key" ON "pharmacy_drugs"("pharmacy_id", "drug_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_invoices_invoice_number_key" ON "supplier_invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "general_drugs_drug_id_key" ON "general_drugs"("drug_id");

-- AddForeignKey
ALTER TABLE "general_drugs" ADD CONSTRAINT "general_drugs_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("drug_id") ON DELETE CASCADE ON UPDATE CASCADE;

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
