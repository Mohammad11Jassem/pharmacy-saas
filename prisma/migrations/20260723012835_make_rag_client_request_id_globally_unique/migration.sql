/*
  Warnings:

  - A unique constraint covering the columns `[client_request_id]` on the table `rag_requests` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `client_request_id` on the `rag_requests` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "rag_requests" DROP COLUMN "client_request_id",
ADD COLUMN     "client_request_id" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "uq_rag_requests_client_request_id" ON "rag_requests"("client_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "rag_requests_rag_conversation_id_client_request_id_key" ON "rag_requests"("rag_conversation_id", "client_request_id");
