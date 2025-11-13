
-- Tabela para cupons de clientes/afiliados
CREATE TABLE customer_coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coupon_code TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  cpf TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  last_used_at DATETIME,
  total_usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX idx_customer_coupons_code ON customer_coupons(coupon_code);
CREATE INDEX idx_customer_coupons_user ON customer_coupons(user_id);
CREATE INDEX idx_customer_coupons_cpf ON customer_coupons(cpf);
