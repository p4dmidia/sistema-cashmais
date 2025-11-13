
-- Fix foreign key constraint issues by cleaning up orphaned records
-- First, remove any company_cashiers records that reference non-existent user_profiles
DELETE FROM company_cashiers 
WHERE user_id NOT IN (SELECT id FROM user_profiles);

-- Remove any cashier_sessions that reference non-existent cashiers
DELETE FROM cashier_sessions 
WHERE cashier_id NOT IN (SELECT id FROM company_cashiers);

-- Remove any company_purchases that reference non-existent cashiers or coupons
DELETE FROM company_purchases 
WHERE cashier_id NOT IN (SELECT id FROM company_cashiers)
OR customer_coupon_id NOT IN (SELECT id FROM customer_coupons);

-- Remove any customer_coupons that reference non-existent user_profiles
DELETE FROM customer_coupons 
WHERE user_id NOT IN (SELECT id FROM user_profiles);
