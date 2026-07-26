-- CreateEnum
CREATE TYPE "SubscriptionPlanType" AS ENUM ('STARTER', 'PROFESSIONAL', 'Enterprise');

-- CreateEnum
CREATE TYPE "SubscriptionPlanStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OfferScope" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "PharmacySubscriptionStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'EXPIRED', 'CANCELLED');

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
