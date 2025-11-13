
-- Clean up orphaned records that are causing foreign key constraint failures

-- First, let's check for orphaned records and clean them up
-- Remove company_cashiers that reference non-existent user_profiles
DELETE FROM company_cashiers 
WHERE user_id NOT IN (SELECT id FROM user_profiles);

-- Remove cashier_sessions that reference non-existent company_cashiers
DELETE FROM cashier_sessions 
WHERE cashier_id NOT IN (SELECT id FROM company_cashiers);

-- Remove company_purchases that reference non-existent cashiers or coupons
DELETE FROM company_purchases 
WHERE cashier_id NOT IN (SELECT id FROM company_cashiers)
   OR customer_coupon_id NOT IN (SELECT id FROM customer_coupons);

-- Remove customer_coupons that reference non-existent user_profiles
DELETE FROM customer_coupons 
WHERE user_id NOT IN (SELECT id FROM user_profiles);

-- Remove password_reset_tokens that reference non-existent companies
DELETE FROM password_reset_tokens 
WHERE company_id NOT IN (SELECT id FROM companies);

-- Remove company_sessions that reference non-existent companies
DELETE FROM company_sessions 
WHERE company_id NOT IN (SELECT id FROM companies);

-- Remove company_cashback_config that references non-existent companies
DELETE FROM company_cashback_config 
WHERE company_id NOT IN (SELECT id FROM companies);

-- Remove network_structure entries that reference non-existent user_profiles
DELETE FROM network_structure 
WHERE user_id NOT IN (SELECT id FROM user_profiles)
   OR sponsor_id NOT IN (SELECT id FROM user_profiles);

-- Remove user_settings that reference non-existent user_profiles
DELETE FROM user_settings 
WHERE user_id NOT IN (SELECT id FROM user_profiles);

-- Remove transactions that reference non-existent user_profiles
DELETE FROM transactions 
WHERE user_id NOT IN (SELECT id FROM user_profiles);

-- Remove withdrawals that reference non-existent user_profiles
DELETE FROM withdrawals 
WHERE user_id NOT IN (SELECT id FROM user_profiles);
