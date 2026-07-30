-- CreateEnum
CREATE TYPE "RagMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "RagRequestStatus" AS ENUM ('PROCESSING', 'SUCCEEDED', 'FAILED', 'EXPIRED');

-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "rag_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rag_max_completed_turns_per_conversation" INTEGER,
ADD COLUMN     "rag_monthly_request_limit" INTEGER;

-- CreateTable
CREATE TABLE "rag_conversations" (
    "rag_conversation_id" SERIAL NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "title" VARCHAR(150) NOT NULL DEFAULT 'New conversation',
    "last_message_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_conversations_pkey" PRIMARY KEY ("rag_conversation_id")
);

-- CreateTable
CREATE TABLE "rag_messages" (
    "rag_message_id" SERIAL NOT NULL,
    "rag_request_id" INTEGER NOT NULL,
    "role" "RagMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rag_messages_pkey" PRIMARY KEY ("rag_message_id")
);

-- CreateTable
CREATE TABLE "rag_requests" (
    "rag_request_id" SERIAL NOT NULL,
    "pharmacy_subscription_id" INTEGER NOT NULL,
    "rag_conversation_id" INTEGER NOT NULL,
    "turn_number" INTEGER NOT NULL,
    "client_request_id" VARCHAR(100) NOT NULL,
    "status" "RagRequestStatus" NOT NULL DEFAULT 'PROCESSING',
    "lease_expires_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "failure_code" VARCHAR(100),
    "summary_updated" BOOLEAN NOT NULL DEFAULT false,
    "latency_ms" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_requests_pkey" PRIMARY KEY ("rag_request_id")
);

-- CreateTable
CREATE TABLE "rag_usage_daily" (
    "rag_usage_daily_id" SERIAL NOT NULL,
    "pharmacy_subscription_id" INTEGER NOT NULL,
    "usage_date" DATE NOT NULL,
    "usage_period_start" TIMESTAMP(3) NOT NULL,
    "usage_period_end" TIMESTAMP(3) NOT NULL,
    "successful_requests" INTEGER NOT NULL DEFAULT 0,
    "failed_requests" INTEGER NOT NULL DEFAULT 0,
    "expired_requests" INTEGER NOT NULL DEFAULT 0,
    "summary_updates" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_usage_daily_pkey" PRIMARY KEY ("rag_usage_daily_id")
);

-- CreateTable
CREATE TABLE "rag_conversation_memories" (
    "rag_conversation_memory_id" SERIAL NOT NULL,
    "rag_conversation_id" INTEGER NOT NULL,
    "summary_text" TEXT NOT NULL,
    "structured_state" JSONB,
    "summarized_until_turn" INTEGER NOT NULL DEFAULT 0,
    "memory_schema_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_conversation_memories_pkey" PRIMARY KEY ("rag_conversation_memory_id")
);

-- CreateTable
CREATE TABLE "rag_message_citations" (
    "rag_message_citation_id" SERIAL NOT NULL,
    "rag_message_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,
    "document_id" VARCHAR(255),
    "chunk_id" VARCHAR(255),
    "title" VARCHAR(255),
    "page" INTEGER,
    "snippet" TEXT,
    "score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rag_message_citations_pkey" PRIMARY KEY ("rag_message_citation_id")
);

-- CreateIndex
CREATE INDEX "rag_conversations_pharmacy_id_archived_at_last_message_at_idx" ON "rag_conversations"("pharmacy_id", "archived_at", "last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "rag_messages_rag_request_id_role_key" ON "rag_messages"("rag_request_id", "role");

-- CreateIndex
CREATE INDEX "rag_requests_pharmacy_subscription_id_status_started_at_idx" ON "rag_requests"("pharmacy_subscription_id", "status", "started_at");

-- CreateIndex
CREATE INDEX "rag_requests_rag_conversation_id_status_lease_expires_at_idx" ON "rag_requests"("rag_conversation_id", "status", "lease_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "rag_requests_rag_conversation_id_client_request_id_key" ON "rag_requests"("rag_conversation_id", "client_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "rag_requests_rag_conversation_id_turn_number_key" ON "rag_requests"("rag_conversation_id", "turn_number");

-- CreateIndex
CREATE INDEX "rag_usage_daily_pharmacy_subscription_id_usage_period_start_idx" ON "rag_usage_daily"("pharmacy_subscription_id", "usage_period_start", "usage_period_end");

-- CreateIndex
CREATE UNIQUE INDEX "rag_usage_daily_pharmacy_subscription_id_usage_date_key" ON "rag_usage_daily"("pharmacy_subscription_id", "usage_date");

-- CreateIndex
CREATE UNIQUE INDEX "rag_conversation_memories_rag_conversation_id_key" ON "rag_conversation_memories"("rag_conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "rag_message_citations_rag_message_id_position_key" ON "rag_message_citations"("rag_message_id", "position");

-- AddForeignKey
ALTER TABLE "rag_conversations" ADD CONSTRAINT "rag_conversations_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("pharmacy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_messages" ADD CONSTRAINT "rag_messages_rag_request_id_fkey" FOREIGN KEY ("rag_request_id") REFERENCES "rag_requests"("rag_request_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_requests" ADD CONSTRAINT "rag_requests_pharmacy_subscription_id_fkey" FOREIGN KEY ("pharmacy_subscription_id") REFERENCES "pharmacy_subscriptions"("pharmacy_subscription_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_requests" ADD CONSTRAINT "rag_requests_rag_conversation_id_fkey" FOREIGN KEY ("rag_conversation_id") REFERENCES "rag_conversations"("rag_conversation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_usage_daily" ADD CONSTRAINT "rag_usage_daily_pharmacy_subscription_id_fkey" FOREIGN KEY ("pharmacy_subscription_id") REFERENCES "pharmacy_subscriptions"("pharmacy_subscription_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_conversation_memories" ADD CONSTRAINT "rag_conversation_memories_rag_conversation_id_fkey" FOREIGN KEY ("rag_conversation_id") REFERENCES "rag_conversations"("rag_conversation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_message_citations" ADD CONSTRAINT "rag_message_citations_rag_message_id_fkey" FOREIGN KEY ("rag_message_id") REFERENCES "rag_messages"("rag_message_id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "rag_requests"
ADD CONSTRAINT "rag_requests_turn_number_check"
CHECK ("turn_number" > 0);

ALTER TABLE "rag_requests"
ADD CONSTRAINT "rag_requests_latency_ms_check"
CHECK ("latency_ms" IS NULL OR "latency_ms" >= 0);

ALTER TABLE "rag_requests"
ADD CONSTRAINT "rag_requests_finished_at_check"
CHECK (
  "finished_at" IS NULL
  OR "finished_at" >= "started_at"
);

ALTER TABLE "rag_requests"
ADD CONSTRAINT "rag_requests_lease_expires_at_check"
CHECK ("lease_expires_at" >= "started_at");

ALTER TABLE "rag_usage_daily"
ADD CONSTRAINT "rag_usage_daily_period_check"
CHECK ("usage_period_end" > "usage_period_start");

ALTER TABLE "rag_usage_daily"
ADD CONSTRAINT "rag_usage_daily_counts_check"
CHECK (
  "successful_requests" >= 0
  AND "failed_requests" >= 0
  AND "expired_requests" >= 0
  AND "summary_updates" >= 0
);

ALTER TABLE "rag_conversation_memories"
ADD CONSTRAINT "rag_conversation_memories_summary_turn_check"
CHECK ("summarized_until_turn" >= 0);

ALTER TABLE "rag_conversation_memories"
ADD CONSTRAINT "rag_conversation_memories_schema_version_check"
CHECK ("memory_schema_version" > 0);

ALTER TABLE "rag_message_citations"
ADD CONSTRAINT "rag_message_citations_position_check"
CHECK ("position" > 0);