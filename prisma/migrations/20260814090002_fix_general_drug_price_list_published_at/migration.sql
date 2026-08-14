-- =========================================================
-- 1. Drop foreign keys that use the current camelCase columns
-- =========================================================

ALTER TABLE "general_drug_price_list_items"
DROP CONSTRAINT "general_drug_price_list_items_generalDrugId_fkey";

ALTER TABLE "general_drug_price_list_items"
DROP CONSTRAINT "general_drug_price_list_items_generalDrugPriceListId_fkey";

ALTER TABLE "pharmacies"
DROP CONSTRAINT "pharmacies_lastAppliedGeneralDrugPriceListId_fkey";


-- =========================================================
-- 2. Drop indexes whose names belong to the old structure
-- =========================================================

DROP INDEX "general_drug_price_list_items_generalDrugId_idx";

DROP INDEX "general_drug_price_list_items_generalDrugPriceListId_genera_key";

DROP INDEX "general_drug_price_lists_publishedAt_idx";

DROP INDEX "pharmacies_lastAppliedGeneralDrugPriceListId_idx";


-- =========================================================
-- 3. Rename GeneralDrugPriceListItem columns
--    RENAME preserves the existing data
-- =========================================================

ALTER TABLE "general_drug_price_list_items"
RENAME COLUMN "generalDrugPriceListItemId"
TO "general_drug_price_list_item_id";

ALTER TABLE "general_drug_price_list_items"
RENAME COLUMN "generalDrugPriceListId"
TO "general_drug_price_list_id";

ALTER TABLE "general_drug_price_list_items"
RENAME COLUMN "generalDrugId"
TO "general_drug_id";

ALTER TABLE "general_drug_price_list_items"
RENAME COLUMN "netPrice"
TO "net_price";

ALTER TABLE "general_drug_price_list_items"
RENAME COLUMN "consumerPrice"
TO "consumer_price";


-- =========================================================
-- 4. Rename GeneralDrugPriceList columns
-- =========================================================

ALTER TABLE "general_drug_price_lists"
RENAME COLUMN "generalDrugPriceListId"
TO "general_drug_price_list_id";

ALTER TABLE "general_drug_price_lists"
RENAME COLUMN "publishedAt"
TO "published_at";

ALTER TABLE "general_drug_price_lists"
RENAME COLUMN "createdAt"
TO "created_at";

ALTER TABLE "general_drug_price_lists"
RENAME COLUMN "updatedAt"
TO "updated_at";


-- =========================================================
-- 5. Fix existing NULL published_at values BEFORE NOT NULL
-- =========================================================

UPDATE "general_drug_price_lists"
SET "published_at" = COALESCE(
  "published_at",
  "created_at",
  CURRENT_TIMESTAMP
)
WHERE "published_at" IS NULL;


-- =========================================================
-- 6. published_at must always have a value from now on
-- =========================================================

ALTER TABLE "general_drug_price_lists"
ALTER COLUMN "published_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "general_drug_price_lists"
ALTER COLUMN "published_at" SET NOT NULL;


-- =========================================================
-- 7. Rename Pharmacy column without losing its value
-- =========================================================

ALTER TABLE "pharmacies"
RENAME COLUMN "lastAppliedGeneralDrugPriceListId"
TO "last_applied_general_drug_price_list_id";


-- =========================================================
-- 8. Recreate indexes with the target names
-- =========================================================

CREATE INDEX "general_drug_price_list_items_general_drug_id_idx"
ON "general_drug_price_list_items"("general_drug_id");

CREATE UNIQUE INDEX "general_drug_price_list_items_general_drug_price_list_id_ge_key"
ON "general_drug_price_list_items"(
  "general_drug_price_list_id",
  "general_drug_id"
);

CREATE INDEX "general_drug_price_lists_published_at_idx"
ON "general_drug_price_lists"("published_at");

CREATE INDEX "pharmacies_last_applied_general_drug_price_list_id_idx"
ON "pharmacies"("last_applied_general_drug_price_list_id");


-- =========================================================
-- 9. Recreate foreign keys using the target column names
-- =========================================================

ALTER TABLE "pharmacies"
ADD CONSTRAINT "pharmacies_last_applied_general_drug_price_list_id_fkey"
FOREIGN KEY ("last_applied_general_drug_price_list_id")
REFERENCES "general_drug_price_lists"("general_drug_price_list_id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "general_drug_price_list_items"
ADD CONSTRAINT "general_drug_price_list_items_general_drug_price_list_id_fkey"
FOREIGN KEY ("general_drug_price_list_id")
REFERENCES "general_drug_price_lists"("general_drug_price_list_id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "general_drug_price_list_items"
ADD CONSTRAINT "general_drug_price_list_items_general_drug_id_fkey"
FOREIGN KEY ("general_drug_id")
REFERENCES "general_drugs"("general_drug_id")
ON DELETE CASCADE
ON UPDATE CASCADE;