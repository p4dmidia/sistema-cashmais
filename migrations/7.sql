
CREATE TABLE companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  telefone TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  senha_hash TEXT NOT NULL,
  endereco TEXT,
  site_instagram TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_companies_cnpj ON companies(cnpj);
CREATE INDEX idx_companies_email ON companies(email);

CREATE TABLE company_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_company_sessions_token ON company_sessions(session_token);
CREATE INDEX idx_company_sessions_expires ON company_sessions(expires_at);
