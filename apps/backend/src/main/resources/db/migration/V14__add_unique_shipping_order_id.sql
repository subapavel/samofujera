-- Each order can have at most one shipping record
ALTER TABLE shipping_records ADD CONSTRAINT uq_shipping_records_order_id UNIQUE (order_id);
