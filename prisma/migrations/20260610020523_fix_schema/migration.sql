-- CreateEnum
CREATE TYPE "CustomerRequestStatus" AS ENUM ('PENDING', 'PARTIALLY_FULFILLED', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomerRequestItemStatus" AS ENUM ('PENDING', 'ORDERED', 'RESERVED', 'FULFILLED', 'CANCELLED');

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

-- AddForeignKey
ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "pharmacies"("pharmacy_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequestItem" ADD CONSTRAINT "CustomerRequestItem_customerRequestId_fkey" FOREIGN KEY ("customerRequestId") REFERENCES "CustomerRequest"("customerRequestId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequestItem" ADD CONSTRAINT "CustomerRequestItem_pharmacyDrugId_fkey" FOREIGN KEY ("pharmacyDrugId") REFERENCES "pharmacy_drugs"("pharmacy_drug_id") ON DELETE RESTRICT ON UPDATE CASCADE;
