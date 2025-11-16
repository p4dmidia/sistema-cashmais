-- =============================================
-- CORREÇÃO DE PERMISSÕES E RLS - SUPABASE
-- =============================================

-- Desabilitar RLS temporariamente para permitir testes
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE network_structure DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_cashiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_cashback_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_config DISABLE ROW LEVEL SECURITY;

-- Conceder permissões básicas para anon e authenticated
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Permissões específicas para anon (usuários não autenticados)
GRANT SELECT ON user_profiles TO anon;
GRANT SELECT ON companies TO anon;
GRANT SELECT ON transactions TO anon;
GRANT SELECT ON system_settings TO anon;
GRANT SELECT ON cashback_config TO anon;

-- Permissões para authenticated (usuários autenticados)
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON companies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON withdrawals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON network_structure TO authenticated;
GRANT SELECT, INSERT, UPDATE ON company_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON password_reset_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE ON company_cashiers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON customer_coupons TO authenticated;
GRANT SELECT, INSERT, UPDATE ON company_purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE ON company_cashback_config TO authenticated;
GRANT SELECT, INSERT, UPDATE ON cashier_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON admin_users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON admin_sessions TO authenticated;
GRANT SELECT, INSERT ON admin_audit_logs TO authenticated;
GRANT SELECT ON system_settings TO authenticated;
GRANT SELECT ON cashback_config TO authenticated;

-- Permissões para service_role (admin)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Criar políticas RLS básicas para permitir operações
-- Estas são políticas simples para desenvolvimento - em produção devem ser mais restritivas

-- Política para user_profiles - permitir leitura para todos, escrita para usuários autenticados
CREATE POLICY "Permitir leitura pública" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Permitir inserção autenticados" ON user_profiles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização própria" ON user_profiles FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para companies - permitir leitura pública, escrita para autenticados
CREATE POLICY "Permitir leitura empresas" ON companies FOR SELECT USING (true);
CREATE POLICY "Permitir inserção empresas" ON companies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização empresas" ON companies FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para transactions - permitir leitura pública, escrita para autenticados
CREATE POLICY "Permitir leitura transações" ON transactions FOR SELECT USING (true);
CREATE POLICY "Permitir inserção transações" ON transactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização transações" ON transactions FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para system_settings - leitura pública, escrita restrita
CREATE POLICY "Permitir leitura configurações" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Permitir inserção configurações" ON system_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização configurações" ON system_settings FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para cashback_config - leitura pública
CREATE POLICY "Permitir leitura cashback" ON cashback_config FOR SELECT USING (true);

-- Habilitar RLS novamente nas tabelas principais
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE company_cashback_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_config ENABLE ROW LEVEL SECURITY;

-- Verificar permissões aplicadas
SELECT 'Permissões aplicadas com sucesso!' as status;