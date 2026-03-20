DROP INDEX IF EXISTS idx_ar_work_order;
ALTER TABLE ar_transactions DROP COLUMN IF EXISTS work_order_id;
