ALTER TABLE customer_coupons ADD COLUMN IF NOT EXISTS affiliate_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_customer_coupons_affiliate_id ON customer_coupons(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_customer_coupons_coupon_code ON customer_coupons(coupon_code);