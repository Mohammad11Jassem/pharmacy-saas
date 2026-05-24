-- CreateEnum
CREATE TYPE "DosageFormCategory" AS ENUM ('SOLID', 'LIQUID', 'SEMI_SOLID', 'INJECTION', 'OTHER');

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
ALTER TABLE "general_drugs" ADD CONSTRAINT "general_drugs_dosage_form_id_fkey" FOREIGN KEY ("dosage_form_id") REFERENCES "dosage_forms"("dosage_form_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_ingredients" ADD CONSTRAINT "drug_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "active_ingredients"("ingredient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_ingredients" ADD CONSTRAINT "drug_ingredients_general_drug_id_fkey" FOREIGN KEY ("general_drug_id") REFERENCES "general_drugs"("general_drug_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_category_assignments" ADD CONSTRAINT "drug_category_assignments_general_drug_id_fkey" FOREIGN KEY ("general_drug_id") REFERENCES "general_drugs"("general_drug_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_category_assignments" ADD CONSTRAINT "drug_category_assignments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "drug_categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;
