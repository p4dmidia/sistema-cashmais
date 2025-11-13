
-- Let's create completely new test users with a simple bcrypt hash
-- Using the hash we just generated: $2b$12$cfiBF9vPqJaPNirQO0ghn.w2QChBgenj5fxN4PhNIe4j01JK1LyCi

-- Delete all old sessions first
DELETE FROM company_sessions;
DELETE FROM cashier_sessions;
DELETE FROM affiliate_sessions;

-- Update all existing users with the correct hash for password "123456"
UPDATE companies SET senha_hash = '$2b$12$cfiBF9vPqJaPNirQO0ghn.w2QChBgenj5fxN4PhNIe4j01JK1LyCi';
UPDATE affiliates SET password_hash = '$2b$12$cfiBF9vPqJaPNirQO0ghn.w2QChBgenj5fxN4PhNIe4j01JK1LyCi';
UPDATE company_cashiers SET password_hash = '$2b$12$cfiBF9vPqJaPNirQO0ghn.w2QChBgenj5fxN4PhNIe4j01JK1LyCi';
