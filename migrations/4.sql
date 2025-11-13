
CREATE TABLE withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount_requested REAL NOT NULL,
  fee_amount REAL NOT NULL,
  net_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  pix_key TEXT NOT NULL,
  processed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
