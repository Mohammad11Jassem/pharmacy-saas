-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "subscription_payments" (
    "subscription_payment_id" SERIAL NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "offer_id" INTEGER,
    "pharmacy_subscription_id" INTEGER,
    "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "stripe_checkout_session_id" VARCHAR(255),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("subscription_payment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_pharmacy_subscription_id_key" ON "subscription_payments"("pharmacy_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_idempotency_key_key" ON "subscription_payments"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_stripe_checkout_session_id_key" ON "subscription_payments"("stripe_checkout_session_id");

-- CreateIndex
CREATE INDEX "subscription_payments_pharmacy_id_status_idx" ON "subscription_payments"("pharmacy_id", "status");

-- CreateIndex
CREATE INDEX "subscription_payments_plan_id_idx" ON "subscription_payments"("plan_id");

-- CreateIndex
CREATE INDEX "subscription_payments_offer_id_idx" ON "subscription_payments"("offer_id");

-- CreateIndex
CREATE INDEX "subscription_payments_created_at_idx" ON "subscription_payments"("created_at");

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("pharmacy_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("plan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "plan_offers"("offer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_pharmacy_subscription_id_fkey" FOREIGN KEY ("pharmacy_subscription_id") REFERENCES "pharmacy_subscriptions"("pharmacy_subscription_id") ON DELETE SET NULL ON UPDATE CASCADE;
