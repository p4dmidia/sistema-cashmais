
CREATE TABLE system_commission_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level INTEGER NOT NULL UNIQUE,
  percentage REAL NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_commission_settings (level, percentage) VALUES
(1, 10.0),
(2, 10.0),
(3, 10.0),
(4, 10.0),
(5, 10.0),
(6, 10.0),
(7, 10.0),
(8, 10.0),
(9, 10.0),
(10, 10.0);

CREATE TABLE commission_distributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL,
  affiliate_id INTEGER NOT NULL,
  level INTEGER NOT NULL,
  commission_amount REAL NOT NULL,
  commission_percentage REAL NOT NULL,
  base_cashback REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_commission_distributions_purchase ON commission_distributions(purchase_id);
CREATE INDEX idx_commission_distributions_affiliate ON commission_distributions(affiliate_id);
