ALTER TABLE commission_distributions ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT 0;
ALTER TABLE commission_distributions ADD COLUMN IF NOT EXISTS released_at DATETIME;
CREATE INDEX IF NOT EXISTS idx_commission_distributions_blocked ON commission_distributions(is_blocked);
