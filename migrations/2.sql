
-- Seed data for demo users
-- Note: These are placeholder entries since actual users are managed by Mocha Users Service
-- The real users will be created when they first log in via Google OAuth

-- Demo admin profile (will be linked when admin@cashmais.demo logs in)
INSERT INTO user_profiles (mocha_user_id, cpf, role, is_active, company_name, created_at, updated_at)
VALUES ('demo-admin-001', '11111111111', 'admin', 1, 'CashMais Admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Demo company profile (will be linked when empresa@cashmais.demo logs in)
INSERT INTO user_profiles (mocha_user_id, cpf, role, is_active, company_name, created_at, updated_at)
VALUES ('demo-company-001', '22222222222', 'company', 1, 'Loja Demo Ltda', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Demo affiliate profile (will be linked when afiliado@cashmais.demo logs in)
INSERT INTO user_profiles (mocha_user_id, cpf, role, is_active, sponsor_id, created_at, updated_at)
VALUES ('demo-affiliate-001', '33333333333', 'affiliate', 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
