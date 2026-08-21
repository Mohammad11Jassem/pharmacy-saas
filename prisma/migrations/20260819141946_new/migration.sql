-- CreateIndex
CREATE INDEX "batches_status_expiry_date_idx" ON "batches"("status", "expiry_date");
