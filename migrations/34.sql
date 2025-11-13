
-- Ensure system_commission_settings table has required default values
-- This migration only inserts data, doesn't modify table structure

INSERT OR IGNORE INTO system_commission_settings (level, percentage, is_active, created_at, updated_at) 
VALUES 
  (1, 10.0, 1, datetime('now'), datetime('now')),
  (2, 10.0, 1, datetime('now'), datetime('now')),
  (3, 10.0, 1, datetime('now'), datetime('now')),
  (4, 10.0, 1, datetime('now'), datetime('now')),
  (5, 10.0, 1, datetime('now'), datetime('now')),
  (6, 10.0, 1, datetime('now'), datetime('now')),
  (7, 10.0, 1, datetime('now'), datetime('now')),
  (8, 10.0, 1, datetime('now'), datetime('now')),
  (9, 10.0, 1, datetime('now'), datetime('now')),
  (10, 10.0, 1, datetime('now'), datetime('now'));

-- Add performance indices if they don't exist
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_user ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_commission_purchase ON commission_distributions(purchase_id);
CREATE INDEX IF NOT EXISTS idx_commission_affiliate ON commission_distributions(affiliate_id);
