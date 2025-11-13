
-- Remove the commission settings we added
DELETE FROM system_commission_settings WHERE level IN (1,2,3,4,5,6,7,8,9,10) AND percentage = 10.0;

-- Remove the indexes we created
DROP INDEX IF EXISTS idx_commission_distributions_purchase_id;
DROP INDEX IF EXISTS idx_commission_distributions_affiliate_id; 
DROP INDEX IF EXISTS idx_commission_distributions_level;
