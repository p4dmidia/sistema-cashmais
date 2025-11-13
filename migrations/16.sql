
-- Migration #15: Fix FOREIGN KEY constraint issues
-- Clean up orphaned records before enabling constraints

-- First, let's clean up any orphaned cashier sessions
DELETE FROM cashier_sessions 
WHERE cashier_id NOT IN (SELECT id FROM company_cashiers);

-- Clean up any orphaned company_cashiers that reference non-existent user_profiles
DELETE FROM company_cashiers 
WHERE user_id NOT IN (SELECT id FROM user_profiles);

-- Clean up any orphaned company_purchases that reference non-existent cashiers
DELETE FROM company_purchases 
WHERE cashier_id NOT IN (SELECT id FROM company_cashiers);

-- Clean up any orphaned company_purchases that reference non-existent customer_coupons
DELETE FROM company_purchases 
WHERE customer_coupon_id NOT IN (SELECT id FROM customer_coupons);

-- Clean up any orphaned customer_coupons that reference non-existent user_profiles
DELETE FROM customer_coupons 
WHERE user_id NOT IN (SELECT id FROM user_profiles);

-- Clean up any orphaned user_settings that reference non-existent user_profiles
DELETE FROM user_settings 
WHERE user_id NOT IN (SELECT id FROM user_profiles);

-- Clean up any orphaned network_structure records that reference non-existent user_profiles
DELETE FROM network_structure 
WHERE user_id NOT IN (SELECT id FROM user_profiles);

DELETE FROM network_structure 
WHERE sponsor_id NOT IN (SELECT id FROM user_profiles);

-- Clean up any orphaned transactions that reference non-existent user_profiles
DELETE FROM transactions 
WHERE user_id NOT IN (SELECT id FROM user_profiles);

-- Clean up any orphaned withdrawals that reference non-existent user_profiles
DELETE FROM withdrawals 
WHERE user_id NOT IN (SELECT id FROM user_profiles);
