
-- Remove the default commission settings that were added
DELETE FROM system_commission_settings 
WHERE level BETWEEN 1 AND 10 
  AND percentage = 10.0 
  AND is_active = 1;

-- Drop the indices that were added
DROP INDEX IF EXISTS idx_commission_affiliate;
DROP INDEX IF EXISTS idx_commission_purchase;
DROP INDEX IF EXISTS idx_admin_audit_user;
DROP INDEX IF EXISTS idx_admin_sessions_user;
DROP INDEX IF EXISTS idx_admin_sessions_token;
