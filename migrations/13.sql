
-- Tabela para sessões de caixas (login separado dos caixas)
CREATE TABLE cashier_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cashier_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cashier_id) REFERENCES company_cashiers(id) ON DELETE CASCADE
);

-- Índice para performance
CREATE INDEX idx_cashier_sessions_token ON cashier_sessions(session_token);
CREATE INDEX idx_cashier_sessions_expires ON cashier_sessions(expires_at);
