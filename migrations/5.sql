
CREATE TABLE user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  pix_key TEXT,
  leg_preference TEXT DEFAULT 'automatic',
  is_active_this_month BOOLEAN DEFAULT 0,
  total_earnings REAL DEFAULT 0,
  available_balance REAL DEFAULT 0,
  frozen_balance REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
