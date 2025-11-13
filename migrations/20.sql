
CREATE TABLE affiliate_password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
);

CREATE INDEX idx_affiliate_password_reset_tokens_token ON affiliate_password_reset_tokens(token);
CREATE INDEX idx_affiliate_password_reset_tokens_affiliate_id ON affiliate_password_reset_tokens(affiliate_id);
