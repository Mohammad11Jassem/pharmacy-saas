/*
  Warnings:

  - The values [Enterprise] on the enum `SubscriptionPlanType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionPlanType_new" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');
ALTER TABLE "subscription_plans" ALTER COLUMN "type" TYPE "SubscriptionPlanType_new" USING ("type"::text::"SubscriptionPlanType_new");
ALTER TYPE "SubscriptionPlanType" RENAME TO "SubscriptionPlanType_old";
ALTER TYPE "SubscriptionPlanType_new" RENAME TO "SubscriptionPlanType";
DROP TYPE "public"."SubscriptionPlanType_old";
COMMIT;
