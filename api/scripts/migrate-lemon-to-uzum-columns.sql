-- Run once on production PostgreSQL when upgrading from Lemon Squeezy to Uzum Checkout.
-- Renames order payment columns without losing historical data.

ALTER TABLE orders RENAME COLUMN lemon_checkout_id TO uzum_checkout_id;
ALTER TABLE orders RENAME COLUMN lemon_order_id TO uzum_order_id;
