
-- Migration #37: Ensure demo user profiles exist before other migrations reference them
-- This migration creates the necessary user_profile records that migration #2 was supposed to create
-- but may be missing in production

-- Only insert if they don't already exist
INSERT OR IGNORE INTO user_profiles (id, mocha_user_id, cpf, role, is_active, company_name, created_at, updated_at)
VALUES 
  (1, 'demo-admin-001', '11111111111', 'admin', 1, 'CashMais Admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (2, 'demo-company-001', '22222222222', 'company', 1, 'Loja Demo Ltda', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (3, 'demo-affiliate-001', '33333333333', 'affiliate', 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Ensure customer_coupons that reference these users are safe
-- Delete any orphaned coupons and recreate them
DELETE FROM customer_coupons WHERE user_id IN (1, 2, 3) AND coupon_code IN ('CM000123', 'CM000124', 'CM000125');

INSERT OR IGNORE INTO customer_coupons (coupon_code, user_id, cpf, is_active) VALUES 
  ('CM000123', 1, '12345678901', 1),
  ('CM000124', 2, '98765432100', 1),
  ('CM000125', 3, '11111111111', 1);
