-- CreateTable
CREATE TABLE "invoice_activities" (
    "invoice_activity_id" SERIAL NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "message" VARCHAR(255) NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_activities_pkey" PRIMARY KEY ("invoice_activity_id")
);

-- CreateIndex
CREATE INDEX "invoice_activities_pharmacy_id_occurred_at_idx" ON "invoice_activities"("pharmacy_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "invoice_activities" ADD CONSTRAINT "invoice_activities_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("pharmacy_id") ON DELETE CASCADE ON UPDATE CASCADE;
