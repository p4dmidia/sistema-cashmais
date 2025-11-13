
-- Tabela para vincular caixas/operadores às empresas
CREATE TABLE company_cashiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  name TEXT,
  cpf TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  last_access_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  UNIQUE(company_id, cpf)
);

-- Índices para performance
CREATE INDEX idx_company_cashiers_company ON company_cashiers(company_id);
CREATE INDEX idx_company_cashiers_cpf ON company_cashiers(cpf);
