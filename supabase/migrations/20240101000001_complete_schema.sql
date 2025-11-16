-- =============================================
-- CASHMAIS - SUPABASE MIGRATION SCRIPT
-- =============================================

-- 1. TABELA DE PERFIS DE USUÁRIO (base para todos os usuários)
CREATE TABLE user_profiles (
  id BIGSERIAL PRIMARY KEY,
  mocha_user_id TEXT NOT NULL UNIQUE,
  cpf TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'affiliate',
  is_active BOOLEAN DEFAULT true,
  sponsor_id BIGINT REFERENCES user_profiles(id),
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para user_profiles
CREATE INDEX idx_user_profiles_mocha_user_id ON user_profiles(mocha_user_id);
CREATE INDEX idx_user_profiles_cpf ON user_profiles(cpf);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_sponsor ON user_profiles(sponsor_id);

-- 2. TABELA DE TRANSAÇÕES (compras e cashback)
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id),
  company_name TEXT NOT NULL,
  purchase_value DECIMAL(10,2) NOT NULL,
  cashback_value DECIMAL(10,2) NOT NULL,
  level_earned INTEGER NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para transactions
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_company ON transactions(company_name);

-- 3. TABELA DE SAQUES (withdrawals)
CREATE TABLE withdrawals (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id),
  amount_requested DECIMAL(10,2) NOT NULL,
  fee_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  pix_key TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para withdrawals
CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);

-- 4. TABELA DE CONFIGURAÇÕES DO USUÁRIO
CREATE TABLE user_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  pix_key TEXT,
  leg_preference TEXT DEFAULT 'automatic',
  is_active_this_month BOOLEAN DEFAULT false,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  available_balance DECIMAL(10,2) DEFAULT 0,
  frozen_balance DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para user_settings
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- 5. TABELA DE ESTRUTURA DE REDE (network marketing)
CREATE TABLE network_structure (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  sponsor_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  is_active_this_month BOOLEAN DEFAULT false,
  last_purchase_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para network_structure
CREATE INDEX idx_network_structure_user_id ON network_structure(user_id);
CREATE INDEX idx_network_structure_sponsor_id ON network_structure(sponsor_id);
CREATE INDEX idx_network_structure_level ON network_structure(level);

-- 6. TABELA DE EMPRESAS PARCEIRAS
CREATE TABLE companies (
  id BIGSERIAL PRIMARY KEY,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  telefone TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  senha_hash TEXT NOT NULL,
  endereco TEXT,
  site_instagram TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para companies
CREATE INDEX idx_companies_cnpj ON companies(cnpj);
CREATE INDEX idx_companies_email ON companies(email);
CREATE INDEX idx_companies_active ON companies(is_active);

-- 7. TABELA DE SESSÕES DE EMPRESAS
CREATE TABLE company_sessions (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para company_sessions
CREATE INDEX idx_company_sessions_token ON company_sessions(session_token);
CREATE INDEX idx_company_sessions_expires ON company_sessions(expires_at);
CREATE INDEX idx_company_sessions_company ON company_sessions(company_id);

-- 8. TABELA DE TOKENS DE REDEFINIÇÃO DE SENHA
CREATE TABLE password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para password_reset_tokens
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_company_id ON password_reset_tokens(company_id);
CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- 9. TABELA DE CAIXAS/OPERADORES DAS EMPRESAS
CREATE TABLE company_cashiers (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT,
  cpf TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_access_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, cpf)
);

-- Índices para company_cashiers
CREATE INDEX idx_company_cashiers_company ON company_cashiers(company_id);
CREATE INDEX idx_company_cashiers_cpf ON company_cashiers(cpf);
CREATE INDEX idx_company_cashiers_user ON company_cashiers(user_id);

-- 10. TABELA DE CUPONS DE CLIENTES/AFILIADOS
CREATE TABLE customer_coupons (
  id BIGSERIAL PRIMARY KEY,
  coupon_code TEXT NOT NULL UNIQUE,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  cpf TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  total_usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para customer_coupons
CREATE INDEX idx_customer_coupons_code ON customer_coupons(coupon_code);
CREATE INDEX idx_customer_coupons_user ON customer_coupons(user_id);
CREATE INDEX idx_customer_coupons_cpf ON customer_coupons(cpf);

-- 11. TABELA DE COMPRAS DAS EMPRESAS
CREATE TABLE company_purchases (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cashier_id BIGINT NOT NULL REFERENCES company_cashiers(id) ON DELETE CASCADE,
  customer_coupon_id BIGINT NOT NULL REFERENCES customer_coupons(id) ON DELETE CASCADE,
  customer_coupon TEXT NOT NULL,
  cashier_cpf TEXT NOT NULL,
  purchase_value DECIMAL(10,2) NOT NULL,
  cashback_percentage DECIMAL(5,2) NOT NULL,
  cashback_generated DECIMAL(10,2) NOT NULL,
  purchase_date DATE NOT NULL,
  purchase_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para company_purchases
CREATE INDEX idx_company_purchases_company ON company_purchases(company_id);
CREATE INDEX idx_company_purchases_cashier ON company_purchases(cashier_id);
CREATE INDEX idx_company_purchases_date ON company_purchases(purchase_date);
CREATE INDEX idx_company_purchases_coupon ON company_purchases(customer_coupon);
CREATE INDEX idx_company_purchases_value ON company_purchases(purchase_value);

-- 12. TABELA DE CONFIGURAÇÃO DE CASHBACK POR EMPRESA
CREATE TABLE company_cashback_config (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  cashback_percentage DECIMAL(5,2) NOT NULL DEFAULT 5.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para company_cashback_config
CREATE INDEX idx_company_cashback_config_company ON company_cashback_config(company_id);

-- 13. TABELA DE SESSÕES DE CAIXAS
CREATE TABLE cashier_sessions (
  id BIGSERIAL PRIMARY KEY,
  cashier_id BIGINT NOT NULL REFERENCES company_cashiers(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para cashier_sessions
CREATE INDEX idx_cashier_sessions_token ON cashier_sessions(session_token);
CREATE INDEX idx_cashier_sessions_expires ON cashier_sessions(expires_at);
CREATE INDEX idx_cashier_sessions_cashier ON cashier_sessions(cashier_id);

-- 14. TABELA DE ADMINISTRADORES
CREATE TABLE admin_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para admin_users
CREATE INDEX idx_admin_users_username ON admin_users(username);
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_active ON admin_users(is_active);

-- 15. TABELA DE SESSÕES DE ADMIN
CREATE TABLE admin_sessions (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para admin_sessions
CREATE INDEX idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX idx_admin_sessions_user ON admin_sessions(admin_user_id);

-- 16. TABELA DE LOGS DE AUDITORIA DO ADMIN
CREATE TABLE admin_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id BIGINT,
  old_data TEXT,
  new_data TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para admin_audit_logs
CREATE INDEX idx_admin_audit_logs_user ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX idx_admin_audit_logs_entity ON admin_audit_logs(entity_type, entity_id);
CREATE INDEX idx_admin_audit_logs_created ON admin_audit_logs(created_at);

-- 17. TABELA DE CONFIGURAÇÕES DO SISTEMA
CREATE TABLE system_settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para system_settings
CREATE INDEX idx_system_settings_key ON system_settings(key);

-- 18. TABELA DE CONFIGURAÇÃO DE CASHBACK (níveis)
CREATE TABLE cashback_config (
  id BIGSERIAL PRIMARY KEY,
  level INTEGER NOT NULL UNIQUE,
  percentage DECIMAL(5,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para cashback_config
CREATE INDEX idx_cashback_config_level ON cashback_config(level);
CREATE INDEX idx_cashback_config_active ON cashback_config(is_active);

-- =============================================
-- DADOS INICIAIS (SEED DATA)
-- =============================================

-- Configurações padrão do sistema
INSERT INTO system_settings (key, value, description) VALUES
('min_withdrawal_amount', '50.00', 'Valor mínimo para saque em R$'),
('withdrawal_fee_percentage', '5.00', 'Taxa de saque em %'),
('company_default_cashback', '5.00', 'Cashback padrão para novas empresas'),
('max_network_levels', '3', 'Número máximo de níveis na rede'),
('site_name', 'CashMais', 'Nome do site'),
('site_url', 'https://cashmais.com.br', 'URL do site');

-- Configuração de cashback por nível
INSERT INTO cashback_config (level, percentage, description) VALUES
(1, 10.00, 'Cashback nível 1 - Indicação direta'),
(2, 5.00, 'Cashback nível 2 - Segundo nível'),
(3, 2.00, 'Cashback nível 3 - Terceiro nível');

-- Admin padrão (senha: admin123)
INSERT INTO admin_users (username, email, password_hash, full_name, is_active) 
VALUES ('admin', 'admin@cashmais.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeeMrLK9FwdN0F.Le', 'Administrador CashMais', true);

-- =============================================
-- POLÍTICAS DE SEGURANÇA (RLS - Row Level Security)
-- =============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
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

-- =============================================
-- POLÍTICAS DE ACESSO
-- =============================================

-- 1. Configurações do sistema - acesso público para leitura
CREATE POLICY "Configurações públicas" ON system_settings
  FOR SELECT USING (true);

CREATE POLICY "Configurações públicas de cashback" ON cashback_config
  FOR SELECT USING (true);

-- 2. User Profiles - usuários podem ver apenas seus próprios dados
CREATE POLICY "Usuários veem próprio perfil" ON user_profiles
  FOR SELECT USING (auth.uid()::text = mocha_user_id);

CREATE POLICY "Usuários podem atualizar próprio perfil" ON user_profiles
  FOR UPDATE USING (auth.uid()::text = mocha_user_id);

-- 3. Transactions - usuários veem apenas suas transações
CREATE POLICY "Transações próprias" ON transactions
  FOR SELECT USING (
    user_id = (SELECT id FROM user_profiles WHERE mocha_user_id = auth.uid()::text)
  );

-- 4. Withdrawals - usuários veem apenas seus saques
CREATE POLICY "Saques próprios" ON withdrawals
  FOR SELECT USING (
    user_id = (SELECT id FROM user_profiles WHERE mocha_user_id = auth.uid()::text)
  );

CREATE POLICY "Usuários podem criar saques" ON withdrawals
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM user_profiles WHERE mocha_user_id = auth.uid()::text)
  );

-- 5. User Settings - configurações pessoais
CREATE POLICY "Configurações pessoais" ON user_settings
  FOR ALL USING (
    user_id = (SELECT id FROM user_profiles WHERE mocha_user_id = auth.uid()::text)
  );

-- 6. Network Structure - visualização da rede
CREATE POLICY "Rede do usuário" ON network_structure
  FOR SELECT USING (
    user_id = (SELECT id FROM user_profiles WHERE mocha_user_id = auth.uid()::text)
    OR sponsor_id = (SELECT id FROM user_profiles WHERE mocha_user_id = auth.uid()::text)
  );

-- 7. Customer Coupons - cupons do próprio usuário
CREATE POLICY "Cupons próprios" ON customer_coupons
  FOR SELECT USING (
    user_id = (SELECT id FROM user_profiles WHERE mocha_user_id = auth.uid()::text)
  );

-- 8. Companies - empresas parceiras (visão pública limitada)
CREATE POLICY "Empresas ativas públicas" ON companies
  FOR SELECT USING (is_active = true);

-- Permissões básicas para anon e authenticated
GRANT SELECT ON system_settings TO anon, authenticated;
GRANT SELECT ON cashback_config TO anon, authenticated;
GRANT SELECT ON companies TO anon, authenticated;
GRANT SELECT ON user_profiles TO anon, authenticated;
GRANT SELECT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT ON transactions TO authenticated;
GRANT SELECT, INSERT ON withdrawals TO authenticated;
GRANT ALL ON user_settings TO authenticated;
GRANT SELECT ON network_structure TO authenticated;
GRANT SELECT ON customer_coupons TO authenticated;

-- Permissões para admin (serão mais restritivas)
GRANT SELECT ON admin_users TO authenticated;
GRANT SELECT ON admin_sessions TO authenticated;
GRANT SELECT ON admin_audit_logs TO authenticated;

-- =============================================
-- FUNÇÕES ÚTEIS
-- =============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON withdrawals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_network_structure_updated_at BEFORE UPDATE ON network_structure
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_sessions_updated_at BEFORE UPDATE ON company_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_password_reset_tokens_updated_at BEFORE UPDATE ON password_reset_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_cashiers_updated_at BEFORE UPDATE ON company_cashiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_coupons_updated_at BEFORE UPDATE ON customer_coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_purchases_updated_at BEFORE UPDATE ON company_purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_cashback_config_updated_at BEFORE UPDATE ON company_cashback_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cashier_sessions_updated_at BEFORE UPDATE ON cashier_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_sessions_updated_at BEFORE UPDATE ON admin_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FIM DO SCRIPT
-- =============================================