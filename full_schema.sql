-- =============================================
-- CASHMAIS - CONSOLIDATED DATABASE SCHEMA
-- Generated for full database recreation
-- =============================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- PERFIS DE USUÁRIO (base para todos os usuários)
CREATE TABLE IF NOT EXISTS user_profiles (
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

-- AFILIADOS (Estrutura específica)
CREATE TABLE IF NOT EXISTS affiliates (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    sponsor_id INTEGER REFERENCES affiliates(id),
    referral_code TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    position_slot SMALLINT NULL CHECK (position_slot >= 0 AND position_slot <= 2),
    last_access_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- EMPRESAS PARCEIRAS
CREATE TABLE IF NOT EXISTS companies (
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

-- CAIXAS / OPERADORES
CREATE TABLE IF NOT EXISTS company_cashiers (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT,
  cpf TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_access_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, cpf)
);

-- CUPONS DE CUSTOMERS
CREATE TABLE IF NOT EXISTS customer_coupons (
  id BIGSERIAL PRIMARY KEY,
  coupon_code TEXT NOT NULL UNIQUE,
  user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,
  affiliate_id INTEGER REFERENCES affiliates(id),
  cpf TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  total_usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- COMPRAS / TRANSAÇÕES CORPORATIVAS
CREATE TABLE IF NOT EXISTS company_purchases (
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

-- DISTRIBUIÇÃO DE COMISSÃO
CREATE TABLE IF NOT EXISTS commission_distributions (
  id BIGSERIAL PRIMARY KEY,
  purchase_id BIGINT NOT NULL REFERENCES company_purchases(id) ON DELETE CASCADE,
  affiliate_id BIGINT NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  commission_amount NUMERIC(12,2) NOT NULL,
  commission_percentage INTEGER NOT NULL,
  base_cashback NUMERIC(12,2) NOT NULL,
  is_blocked BOOLEAN DEFAULT FALSE,
  released_at TIMESTAMP NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TRANSAÇÕES DE SALDO (Geral)
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES user_profiles(id),
  company_name TEXT NOT NULL,
  purchase_value DECIMAL(10,2) NOT NULL,
  cashback_value DECIMAL(10,2) NOT NULL,
  level_earned INTEGER NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SAQUES
CREATE TABLE IF NOT EXISTS withdrawals (
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

-- CONFIGURAÇÕES DO USUÁRIO
CREATE TABLE IF NOT EXISTS user_settings (
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

-- ESTRUTURA DE REDE (MLM)
CREATE TABLE IF NOT EXISTS network_structure (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  sponsor_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  is_active_this_month BOOLEAN DEFAULT false,
  last_purchase_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CONFIGS DE CASHBACK EMPRESA
CREATE TABLE IF NOT EXISTS company_cashback_config (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  cashback_percentage DECIMAL(5,2) NOT NULL DEFAULT 5.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SESSÕES (Empresa, Caixa, Afiliado, Admin)
CREATE TABLE IF NOT EXISTS company_sessions (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cashier_sessions (
  id BIGSERIAL PRIMARY KEY,
  cashier_id BIGINT NOT NULL REFERENCES company_cashiers(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS affiliate_sessions (
    id BIGSERIAL PRIMARY KEY,
    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ADMIN
CREATE TABLE IF NOT EXISTS admin_users (
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

CREATE TABLE IF NOT EXISTS admin_sessions (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id BIGINT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SISTEMA
CREATE TABLE IF NOT EXISTS system_settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cashback_config (
  id BIGSERIAL PRIMARY KEY,
  level INTEGER NOT NULL UNIQUE,
  percentage DECIMAL(5,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RESET SENHA
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES

CREATE INDEX IF NOT EXISTS idx_affiliates_cpf ON affiliates(cpf);
CREATE INDEX IF NOT EXISTS idx_affiliates_email ON affiliates(email);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_sponsor_id ON affiliates(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_is_active ON affiliates(is_active);
CREATE INDEX IF NOT EXISTS idx_affiliates_position_slot ON affiliates(position_slot);
CREATE UNIQUE INDEX IF NOT EXISTS uq_affiliates_sponsor_slot ON affiliates(sponsor_id, position_slot) WHERE position_slot IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);

CREATE INDEX IF NOT EXISTS idx_company_purchases_company ON company_purchases(company_id);
CREATE INDEX IF NOT EXISTS idx_company_purchases_cashier ON company_purchases(cashier_id);
CREATE INDEX IF NOT EXISTS idx_company_purchases_date ON company_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_company_purchases_coupon ON company_purchases(customer_coupon);

CREATE INDEX IF NOT EXISTS idx_customer_coupons_code ON customer_coupons(coupon_code);
CREATE INDEX IF NOT EXISTS idx_customer_coupons_user ON customer_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_coupons_affiliate_id ON customer_coupons(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_commission_distributions_purchase_id ON commission_distributions(purchase_id);
CREATE INDEX IF NOT EXISTS idx_commission_distributions_affiliate_id ON commission_distributions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commission_distributions_level ON commission_distributions(level);

-- 4. FUNCTIONS & TRIGGERS

-- Atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar Trigger de updated_at em todas as tabelas relevantes
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
        'user_profiles', 'affiliates', 'companies', 'company_cashiers', 'customer_coupons', 
        'company_purchases', 'commission_distributions', 'transactions', 'withdrawals', 
        'user_settings', 'network_structure', 'company_cashback_config', 'admin_users', 
        'system_settings', 'cashback_config'
    )) LOOP
        EXECUTE format('CREATE TRIGGER update_at_trigger_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END;
$$;

-- Buscar membros da rede recursivamente
CREATE OR REPLACE FUNCTION get_network_members_recursive(p_sponsor_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  full_name TEXT,
  email TEXT,
  cpf TEXT,
  created_at TIMESTAMPTZ,
  is_active BOOLEAN,
  level INTEGER,
  sponsor_path INTEGER[]
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE network AS (
    SELECT a.id, a.full_name, a.email, a.cpf, a.created_at, a.is_active, 1 as level, ARRAY[a.sponsor_id] as sponsor_path
    FROM affiliates a
    WHERE a.sponsor_id = p_sponsor_id AND a.is_active = true
    UNION ALL
    SELECT a.id, a.full_name, a.email, a.cpf, a.created_at, a.is_active, n.level + 1, n.sponsor_path || a.sponsor_id
    FROM affiliates a
    INNER JOIN network n ON a.sponsor_id = n.id
    WHERE a.is_active = true AND n.level < 10
  )
  SELECT * FROM network ORDER BY level, created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contador de uso de cupons
CREATE OR REPLACE FUNCTION update_coupon_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customer_coupons 
    SET total_usage_count = total_usage_count + 1,
        last_used_at = NEW.created_at
    WHERE id = NEW.customer_coupon_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_coupon_usage
  AFTER INSERT ON company_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_coupon_usage_count();

-- 5. SEED DATA

INSERT INTO system_settings (key, value, description) VALUES
('min_withdrawal_amount', '50.00', 'Valor mínimo para saque em R$'),
('withdrawal_fee_percentage', '5.00', 'Taxa de saque em %'),
('company_default_cashback', '5.00', 'Cashback padrão para novas empresas'),
('max_network_levels', '3', 'Número máximo de níveis na rede'),
('site_name', 'CashMais', 'Nome do site'),
('site_url', 'https://cashmais.com.br', 'URL do site')
ON CONFLICT (key) DO NOTHING;

INSERT INTO cashback_config (level, percentage, description) VALUES
(1, 10.00, 'Cashback nível 1 - Indicação direta'),
(2, 5.00, 'Cashback nível 2 - Segundo nível'),
(3, 2.00, 'Cashback nível 3 - Terceiro nível')
ON CONFLICT (level) DO NOTHING;

-- Admin padrão (senha: admin123)
INSERT INTO admin_users (username, email, password_hash, full_name, is_active) 
VALUES ('admin', 'admin@cashmais.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeeMrLK9FwdN0F.Le', 'Administrador CashMais', true)
ON CONFLICT (username) DO NOTHING;

-- 6. SECURITY (RLS)

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas Básicas (Exemplos)
CREATE POLICY "Leitura pública configs" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Leitura pública afiliados" ON affiliates FOR SELECT USING (is_active = true);
CREATE POLICY "Inserção pública afiliados" ON affiliates FOR INSERT WITH CHECK (true);
CREATE POLICY "Leitura própria user_profiles" ON user_profiles FOR SELECT USING (auth.uid()::text = mocha_user_id);

-- GESTÃO DE PERMISSÕES
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT ON affiliates TO anon, authenticated;
GRANT UPDATE ON user_profiles TO authenticated;
