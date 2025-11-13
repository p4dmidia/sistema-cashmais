
-- Tabela para configurações de cashback por empresa
CREATE TABLE company_cashback_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL UNIQUE,
  cashback_percentage REAL NOT NULL DEFAULT 5.0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Inserir configuração padrão para empresas existentes
INSERT INTO company_cashback_config (company_id, cashback_percentage)
SELECT id, 5.0 FROM companies WHERE id NOT IN (SELECT company_id FROM company_cashback_config);
