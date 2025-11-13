
CREATE TABLE network_structure (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  sponsor_id INTEGER NOT NULL,
  level INTEGER NOT NULL,
  is_active_this_month BOOLEAN DEFAULT 0,
  last_purchase_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_network_structure_user_id ON network_structure(user_id);
CREATE INDEX idx_network_structure_sponsor_id ON network_structure(sponsor_id);
CREATE INDEX idx_network_structure_level ON network_structure(level);
