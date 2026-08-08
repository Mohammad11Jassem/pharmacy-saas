-- CreateTable
CREATE TABLE "dim_date" (
    "date_key" INTEGER NOT NULL,
    "full_date" DATE NOT NULL,
    "day_of_month" SMALLINT NOT NULL,
    "week_number" SMALLINT NOT NULL,
    "week_year" SMALLINT NOT NULL,
    "month_number" SMALLINT NOT NULL,
    "year_number" SMALLINT NOT NULL,

    CONSTRAINT "pk_dim_date" PRIMARY KEY ("date_key")
);

-- CreateTable
CREATE TABLE "dim_pharmacy" (
    "pharmacy_key" SERIAL NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "pharmacy_name" VARCHAR(255) NOT NULL,

    CONSTRAINT "pk_dim_pharmacy" PRIMARY KEY ("pharmacy_key")
);

-- CreateTable
CREATE TABLE "fact_drug_sales_daily" (
    "drug_sales_daily_id" SERIAL NOT NULL,
    "date_key" INTEGER NOT NULL,
    "pharmacy_key" INTEGER NOT NULL,
    "pharmacy_drug_id" INTEGER NOT NULL,
    "sold_base_quantity" INTEGER NOT NULL DEFAULT 0,
    "gross_sales_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sale_invoice_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_fact_drug_sales_daily" PRIMARY KEY ("drug_sales_daily_id")
);

-- CreateTable
CREATE TABLE "fact_bills_daily" (
    "bills_daily_id" SERIAL NOT NULL,
    "date_key" INTEGER NOT NULL,
    "pharmacy_key" INTEGER NOT NULL,
    "gross_sales_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "return_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "net_sales_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sale_invoice_count" INTEGER NOT NULL DEFAULT 0,
    "return_invoice_count" INTEGER NOT NULL DEFAULT 0,
    "damage_invoice_count" INTEGER NOT NULL DEFAULT 0,
    "supplier_invoice_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_fact_bills_daily" PRIMARY KEY ("bills_daily_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_dim_date_full_date" ON "dim_date"("full_date");

-- CreateIndex
CREATE INDEX "idx_dim_date_year_month_date" ON "dim_date"("year_number", "month_number", "full_date");

-- CreateIndex
CREATE INDEX "idx_dim_date_week_date" ON "dim_date"("week_year", "week_number", "full_date");

-- CreateIndex
CREATE UNIQUE INDEX "uq_dim_pharmacy_pharmacy_id" ON "dim_pharmacy"("pharmacy_id");

-- CreateIndex
CREATE INDEX "idx_fact_drug_sales_daily_pharmacy_date" ON "fact_drug_sales_daily"("pharmacy_key", "date_key");

-- CreateIndex
CREATE INDEX "idx_fact_drug_sales_daily_pharmacy_drug_date" ON "fact_drug_sales_daily"("pharmacy_key", "pharmacy_drug_id", "date_key");

-- CreateIndex
CREATE UNIQUE INDEX "uq_fact_drug_sales_daily_grain" ON "fact_drug_sales_daily"("date_key", "pharmacy_key", "pharmacy_drug_id");

-- CreateIndex
CREATE INDEX "idx_fact_bills_daily_pharmacy_date" ON "fact_bills_daily"("pharmacy_key", "date_key");

-- CreateIndex
CREATE UNIQUE INDEX "uq_fact_bills_daily_grain" ON "fact_bills_daily"("date_key", "pharmacy_key");

-- AddForeignKey
ALTER TABLE "fact_drug_sales_daily" ADD CONSTRAINT "fk_fact_drug_sales_daily_date" FOREIGN KEY ("date_key") REFERENCES "dim_date"("date_key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_drug_sales_daily" ADD CONSTRAINT "fk_fact_drug_sales_daily_pharmacy" FOREIGN KEY ("pharmacy_key") REFERENCES "dim_pharmacy"("pharmacy_key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_bills_daily" ADD CONSTRAINT "fk_fact_bills_daily_date" FOREIGN KEY ("date_key") REFERENCES "dim_date"("date_key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_bills_daily" ADD CONSTRAINT "fk_fact_bills_daily_pharmacy" FOREIGN KEY ("pharmacy_key") REFERENCES "dim_pharmacy"("pharmacy_key") ON DELETE RESTRICT ON UPDATE CASCADE;
