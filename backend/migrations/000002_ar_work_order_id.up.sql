ALTER TABLE ar_transactions
    ADD COLUMN work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX idx_ar_work_order ON ar_transactions(work_order_id) WHERE work_order_id IS NOT NULL;
