
-- Criar alguns cupons de exemplo para teste
INSERT INTO customer_coupons (coupon_code, user_id, cpf) VALUES 
('CM000123', 1, '12345678901'),
('CM000124', 2, '98765432100'),
('CM000125', 3, '11111111111'),
('CM000126', 4, '22222222222'),
('CM000127', 5, '33333333333');

-- Nota: Os user_id acima são fictícios, em produção devem corresponder a user_profiles reais
