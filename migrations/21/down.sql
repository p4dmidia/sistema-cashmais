
-- Remover índices
DROP INDEX IF EXISTS idx_customer_coupons_coupon_code;
DROP INDEX IF EXISTS idx_customer_coupons_affiliate_id;

-- Remover campo
ALTER TABLE customer_coupons DROP COLUMN affiliate_id;
