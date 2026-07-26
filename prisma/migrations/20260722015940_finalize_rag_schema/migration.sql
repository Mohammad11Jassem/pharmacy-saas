
BEGIN;

-- 1) Allow multiple daily usage rows when the subscription period starts
--    at different times on the same calendar day.
DROP INDEX IF EXISTS "rag_usage_daily_pharmacy_subscription_id_usage_date_key";
DROP INDEX IF EXISTS "rag_usage_daily_subscription_date_period_key";

CREATE UNIQUE INDEX "rag_usage_daily_subscription_date_period_key"
ON "rag_usage_daily" (
  "pharmacy_subscription_id",
  "usage_date",
  "usage_period_start"
);

-- 2) A lease must expire strictly after the request starts.
ALTER TABLE "rag_requests"
DROP CONSTRAINT IF EXISTS "rag_requests_lease_expires_at_check";

ALTER TABLE "rag_requests"
ADD CONSTRAINT "rag_requests_lease_expires_at_check"
CHECK ("lease_expires_at" > "started_at");

-- 3) Terminal requests must have finished_at; PROCESSING requests must not.
ALTER TABLE "rag_requests"
DROP CONSTRAINT IF EXISTS "rag_requests_status_finished_at_check";

ALTER TABLE "rag_requests"
ADD CONSTRAINT "rag_requests_status_finished_at_check"
CHECK (
  (
    "status" = 'PROCESSING'
    AND "finished_at" IS NULL
  )
  OR
  (
    "status" IN ('SUCCEEDED', 'FAILED', 'EXPIRED')
    AND "finished_at" IS NOT NULL
  )
);

-- 4) Successful/processing requests cannot carry a failure code.
ALTER TABLE "rag_requests"
DROP CONSTRAINT IF EXISTS "rag_requests_failure_code_check";

ALTER TABLE "rag_requests"
ADD CONSTRAINT "rag_requests_failure_code_check"
CHECK (
  (
    "status" IN ('PROCESSING', 'SUCCEEDED')
    AND "failure_code" IS NULL
  )
  OR "status" IN ('FAILED', 'EXPIRED')
);

-- 5) Only one active PROCESSING request is allowed per conversation.
DROP INDEX IF EXISTS "rag_requests_one_processing_per_conversation_key";

CREATE UNIQUE INDEX "rag_requests_one_processing_per_conversation_key"
ON "rag_requests" ("rag_conversation_id")
WHERE "status" = 'PROCESSING';

-- 6) RAG plan limits cannot be negative.
ALTER TABLE "subscription_plans"
DROP CONSTRAINT IF EXISTS "subscription_plans_rag_max_turns_check";

ALTER TABLE "subscription_plans"
ADD CONSTRAINT "subscription_plans_rag_max_turns_check"
CHECK (
  "rag_max_completed_turns_per_conversation" IS NULL
  OR "rag_max_completed_turns_per_conversation" >= 0
);

ALTER TABLE "subscription_plans"
DROP CONSTRAINT IF EXISTS "subscription_plans_rag_monthly_limit_check";

ALTER TABLE "subscription_plans"
ADD CONSTRAINT "subscription_plans_rag_monthly_limit_check"
CHECK (
  "rag_monthly_request_limit" IS NULL
  OR "rag_monthly_request_limit" >= 0
);

-- 7) The conversation and subscription used by a request must belong
--    to the same pharmacy.
CREATE OR REPLACE FUNCTION "validate_rag_request_pharmacy"()
RETURNS TRIGGER AS $$
DECLARE
  conversation_pharmacy_id INTEGER;
  subscription_pharmacy_id INTEGER;
BEGIN
  SELECT "pharmacy_id"
  INTO conversation_pharmacy_id
  FROM "rag_conversations"
  WHERE "rag_conversation_id" = NEW."rag_conversation_id";

  SELECT "pharmacy_id"
  INTO subscription_pharmacy_id
  FROM "pharmacy_subscriptions"
  WHERE "pharmacy_subscription_id" = NEW."pharmacy_subscription_id";

  IF conversation_pharmacy_id IS DISTINCT FROM subscription_pharmacy_id THEN
    RAISE EXCEPTION
      'RAG conversation and subscription must belong to the same pharmacy';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "rag_requests_same_pharmacy_trigger"
ON "rag_requests";

CREATE TRIGGER "rag_requests_same_pharmacy_trigger"
BEFORE INSERT OR UPDATE OF
  "rag_conversation_id",
  "pharmacy_subscription_id"
ON "rag_requests"
FOR EACH ROW
EXECUTE FUNCTION "validate_rag_request_pharmacy"();

-- 8) Initialize RAG policy for existing plans.
UPDATE "subscription_plans"
SET
  "rag_enabled" = false,
  "rag_max_completed_turns_per_conversation" = 0,
  "rag_monthly_request_limit" = 0
WHERE "type" = 'STARTER';

UPDATE "subscription_plans"
SET
  "rag_enabled" = true,
  "rag_max_completed_turns_per_conversation" = 20,
  "rag_monthly_request_limit" = 500
WHERE "type" = 'PROFESSIONAL';

UPDATE "subscription_plans"
SET
  "rag_enabled" = true,
  "rag_max_completed_turns_per_conversation" = NULL,
  "rag_monthly_request_limit" = NULL
WHERE "type" = 'ENTERPRISE';

COMMIT;
