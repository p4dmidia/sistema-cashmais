-- Check permissions for customer_coupons table
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'customer_coupons' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY grantee;