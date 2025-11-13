
-- Adicionar campo para cupom de compra único do afiliado
ALTER TABLE customer_coupons ADD COLUMN affiliate_id INTEGER;

-- Criar índice para melhor performance
CREATE INDEX idx_customer_coupons_affiliate_id ON customer_coupons(affiliate_id);
CREATE INDEX idx_customer_coupons_coupon_code ON customer_coupons(coupon_code);
