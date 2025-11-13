
-- Tabela para registrar compras realizadas pelos caixas das empresas
CREATE TABLE company_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  cashier_id INTEGER NOT NULL,
  customer_coupon_id INTEGER NOT NULL,
  customer_coupon TEXT NOT NULL,
  cashier_cpf TEXT NOT NULL,
  purchase_value REAL NOT NULL,
  cashback_percentage REAL NOT NULL,
  cashback_generated REAL NOT NULL,
  purchase_date DATE NOT NULL,
  purchase_time TIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (cashier_id) REFERENCES company_cashiers(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_coupon_id) REFERENCES customer_coupons(id) ON DELETE CASCADE
);

-- Índices para performance e relatórios
CREATE INDEX idx_company_purchases_company ON company_purchases(company_id);
CREATE INDEX idx_company_purchases_cashier ON company_purchases(cashier_id);
CREATE INDEX idx_company_purchases_date ON company_purchases(purchase_date);
CREATE INDEX idx_company_purchases_coupon ON company_purchases(customer_coupon);
CREATE INDEX idx_company_purchases_value ON company_purchases(purchase_value);
