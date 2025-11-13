
-- Simple migration to ensure commission settings exist for deployment
-- This addresses the core issue without complex table recreations

-- Insert default commission settings if they don't exist
INSERT OR IGNORE INTO system_commission_settings (level, percentage, is_active) VALUES
(1, 10.0, 1),
(2, 10.0, 1),
(3, 10.0, 1),
(4, 10.0, 1),
(5, 10.0, 1),
(6, 10.0, 1),
(7, 10.0, 1),
(8, 10.0, 1),
(9, 10.0, 1),
(10, 10.0, 1);

-- Ensure commission_distributions table has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_commission_distributions_purchase_id ON commission_distributions(purchase_id);
CREATE INDEX IF NOT EXISTS idx_commission_distributions_affiliate_id ON commission_distributions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commission_distributions_level ON commission_distributions(level);
