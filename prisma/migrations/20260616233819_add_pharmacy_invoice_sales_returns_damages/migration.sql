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
    "pharmacy_drug_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "unit_type" "UnitType" NOT NULL,
    "base_quantity" INTEGER NOT NULL,
    "unit_factor_to_base" INTEGER NOT NULL,
    "damage_reason" "DamageReason" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "damage_invoice_items_pkey" PRIMARY KEY ("damage_invoice_item_id")
);

-- CreateIndex
CREATE INDEX "patients_pharmacy_id_idx" ON "patients"("pharmacy_id");

-- CreateIndex
CREATE INDEX "patients_phone_idx" ON "patients"("phone");

-- CreateIndex
CREATE INDEX "pharmacy_invoices_pharmacy_id_idx" ON "pharmacy_invoices"("pharmacy_id");

-- CreateIndex
CREATE INDEX "pharmacy_invoices_patient_id_idx" ON "pharmacy_invoices"("patient_id");

-- CreateIndex
CREATE INDEX "pharmacy_invoices_invoice_type_idx" ON "pharmacy_invoices"("invoice_type");

-- CreateIndex
CREATE INDEX "pharmacy_invoices_invoice_date_idx" ON "pharmacy_invoices"("invoice_date");

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
CREATE INDEX "damage_invoice_items_pharmacy_drug_id_idx" ON "damage_invoice_items"("pharmacy_drug_id");

-- CreateIndex
CREATE INDEX "damage_invoice_items_batch_id_idx" ON "damage_invoice_items"("batch_id");

-- CreateIndex
CREATE INDEX "batches_pharmacy_drug_id_idx" ON "batches"("pharmacy_drug_id");

-- CreateIndex
CREATE INDEX "batches_supplier_invoice_item_id_idx" ON "batches"("supplier_invoice_item_id");

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
ALTER TABLE "damage_invoice_items" ADD CONSTRAINT "damage_invoice_items_pharmacy_drug_id_fkey" FOREIGN KEY ("pharmacy_drug_id") REFERENCES "pharmacy_drugs"("pharmacy_drug_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_invoice_items" ADD CONSTRAINT "damage_invoice_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("batch_id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "batches"
ADD CONSTRAINT "batches_out_quantity_valid"
CHECK (
  "sold_quantity" >= 0
  AND "sold_quantity" <= "initial_quantity"
);