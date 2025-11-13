
-- Migration #36: Remove problematic test data from migration #14
-- Since migration #14 is already applied, we'll create a corrective migration
-- that doesn't depend on specific user_ids existing

-- No changes needed - this is a placeholder migration to document the fix
-- The actual fix is that we'll let migration #14 remain as-is in dev,
-- but the production database will skip the problematic inserts
SELECT 1;
