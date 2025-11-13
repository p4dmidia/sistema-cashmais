
-- Remove the bootstrap admin user if it was created by this migration
DELETE FROM admin_users WHERE id = 1 AND username = 'admin' AND email = 'admin@cashmais.com';

-- Remove default commission settings
DELETE FROM system_commission_settings WHERE level BETWEEN 1 AND 10 AND percentage = 10.0;

-- Remove indexes (SQLite doesn't support DROP INDEX IF EXISTS gracefully)
-- Indexes are safe to leave as they don't affect data integrity
