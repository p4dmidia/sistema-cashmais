
-- Migration #15: Fix foreign key constraint issues by ensuring admin_users exist first
-- This migration creates a simple admin user if none exist to satisfy foreign key constraints

INSERT OR IGNORE INTO admin_users (id, username, email, password_hash, full_name, is_active)
VALUES (1, 'admin', 'admin@cashmais.com', '$2b$10$defaulthashforbootstrap', 'Administrador', 1);

-- Ensure system commission settings exist with proper default values
INSERT OR IGNORE INTO system_commission_settings (level, percentage) VALUES
(1, 10.0), (2, 10.0), (3, 10.0), (4, 10.0), (5, 10.0),
(6, 10.0), (7, 10.0), (8, 10.0), (9, 10.0), (10, 10.0);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_commission_distributions_purchase ON commission_distributions(purchase_id);
CREATE INDEX IF NOT EXISTS idx_commission_distributions_affiliate ON commission_distributions(affiliate_id);
