-- =============================================
-- CASHMAIS - COMPLETE RLS POLICIES & PERMISSIONS
-- Optimized for Supabase Security
-- =============================================

-- 1. ENABLE RLS FOR ALL TABLES
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_cashiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_cashback_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_sessions ENABLE ROW LEVEL SECURITY;

-- 2. RESET POLICIES (Start from scratch)
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. DEFINE POLICIES

-- SYSTEM SETTINGS & CONFIGS (Public Read)
CREATE POLICY "Public Read for system_settings" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Public Read for cashback_config" ON cashback_config FOR SELECT USING (true);

-- USER PROFILES
CREATE POLICY "Profiles - Own Read" ON user_profiles FOR SELECT 
  USING (auth.uid()::text = mocha_user_id);
CREATE POLICY "Profiles - Public Basic Read" ON user_profiles FOR SELECT 
  USING (true); -- Allow looking up sponsors/links
CREATE POLICY "Profiles - Own Update" ON user_profiles FOR UPDATE 
  USING (auth.uid()::text = mocha_user_id);

-- AFFILIATES
CREATE POLICY "Affiliates - Public Read Active" ON affiliates FOR SELECT 
  USING (is_active = true);
CREATE POLICY "Affiliates - Public Insert" ON affiliates FOR INSERT 
  WITH CHECK (true);
CREATE POLICY "Affiliates - Own Update" ON affiliates FOR UPDATE 
  USING (email = auth.jwt() ->> 'email' OR cpf = auth.jwt() ->> 'cpf'); -- Fallback logic

-- COMPANIES
CREATE POLICY "Companies - Public Read Active" ON companies FOR SELECT 
  USING (is_active = true);
CREATE POLICY "Companies - Auth Update" ON companies FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- TRANSACTIONS
CREATE POLICY "Transactions - Own Read" ON transactions FOR SELECT 
  USING (user_id = (SELECT id FROM user_profiles WHERE mocha_user_id = auth.uid()::text));

-- WITHDRAWALS
CREATE POLICY "Withdrawals - Own Read" ON withdrawals FOR SELECT 
  USING (user_id = (SELECT id FROM user_profiles WHERE mocha_user_id = auth.uid()::text));
CREATE POLICY "Withdrawals - Own Insert" ON withdrawals FOR INSERT 
  WITH CHECK (user_id = (SELECT id FROM user_profiles WHERE mocha_user_id = auth.uid()::text));

-- USER SETTINGS
CREATE POLICY "Settings - Own Read/Update" ON user_settings FOR ALL 
  USING (user_id = (SELECT id FROM user_profiles WHERE mocha_user_id = auth.uid()::text));

-- NETWORK STRUCTURE
CREATE POLICY "Network - Related Read" ON network_structure FOR SELECT 
  USING (user_id = (SELECT id FROM user_profiles WHERE mocha_user_id = auth.uid()::text) 
     OR sponsor_id = (SELECT id FROM user_profiles WHERE mocha_user_id = auth.uid()::text));

-- CUSTOMER COUPONS
CREATE POLICY "Coupons - Own Read" ON customer_coupons FOR SELECT 
  USING (user_id = (SELECT id FROM user_profiles WHERE mocha_user_id = auth.uid()::text)
     OR affiliate_id = (SELECT id FROM affiliates WHERE email = auth.jwt() ->> 'email'));

-- COMMISSION DISTRIBUTIONS
CREATE POLICY "Commissions - Own Read" ON commission_distributions FOR SELECT 
  USING (affiliate_id = (SELECT id FROM affiliates WHERE email = auth.jwt() ->> 'email'));

-- SESSIONS (Service Role only usually, but some limited read for auth)
CREATE POLICY "Sessions - Own Read" ON affiliate_sessions FOR SELECT 
  USING (affiliate_id = (SELECT id FROM affiliates WHERE email = auth.jwt() ->> 'email'));

-- ADMIN (Restricted to authenticated with role admin if possible, else service_role)
-- Note: Supabase doesn't natively have 'admin' role unless defined in JWT. 
-- For now, providing basic policies.

-- 4. GRANTS

-- Allow 'anon' and 'authenticated' to perform basic actions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT ON affiliates TO anon, authenticated;
GRANT INSERT ON customer_coupons TO authenticated;
GRANT INSERT ON withdrawals TO authenticated;
GRANT UPDATE ON user_profiles TO authenticated;
GRANT UPDATE ON user_settings TO authenticated;
GRANT ALL ON cashier_sessions TO anon, authenticated; -- Required for cashier login flow
GRANT ALL ON company_sessions TO anon, authenticated; -- Required for company login flow
GRANT ALL ON affiliate_sessions TO anon, authenticated; -- Required for affiliate login flow

-- Sequences for inserts
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 5. FINAL CHECK
SELECT 'RLS Policies Applied Successfully!' as status;
