
-- Tabela para dados dos afiliados com autenticação própria
CREATE TABLE affiliates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  whatsapp TEXT,
  password_hash TEXT NOT NULL,
  referral_code TEXT UNIQUE,
  sponsor_id INTEGER,
  is_active BOOLEAN DEFAULT 1,
  is_verified BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para sessões de afiliados
CREATE TABLE affiliate_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
);

-- Índices para otimização
CREATE INDEX idx_affiliates_cpf ON affiliates(cpf);
CREATE INDEX idx_affiliates_email ON affiliates(email);
CREATE INDEX idx_affiliates_referral_code ON affiliates(referral_code);
CREATE INDEX idx_affiliate_sessions_token ON affiliate_sessions(session_token);
CREATE INDEX idx_affiliate_sessions_affiliate_id ON affiliate_sessions(affiliate_id);
