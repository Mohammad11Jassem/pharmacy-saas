-- Enable PostgreSQL trigram extension first.
-- gist_trgm_ops is provided by this extension.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CreateIndex
CREATE INDEX "general_drugs_trade_name_trgm_gist_idx" ON "general_drugs" USING GIST ("trade_name" gist_trgm_ops);

-- CreateIndex
CREATE INDEX "private_drugs_trade_name_trgm_gist_idx" ON "private_drugs" USING GIST ("tradeName" gist_trgm_ops);
