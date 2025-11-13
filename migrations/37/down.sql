
-- Remove the demo coupons we created
DELETE FROM customer_coupons WHERE coupon_code IN ('CM000123', 'CM000124', 'CM000125');

-- Don't remove the user_profiles as other data might depend on them
