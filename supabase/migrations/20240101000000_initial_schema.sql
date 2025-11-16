-- Tabela de perfis de usuário
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

-- Índices para performance
CREATE INDEX idx_user_profiles_mocha_user_id ON user_profiles(mocha_user_id);
CREATE INDEX idx_user_profiles_cpf ON user_profiles(cpf);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_sponsor ON user_profiles(sponsor_id);

-- Tabela de transações
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

-- Índices para transações
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_company ON transactions(company_name);

-- Tabela de saques/comissões
CREATE TABLE withdrawals (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES user_profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  pix_key TEXT NOT NULL,
  pix_key_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para saques
CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);

-- Tabela de configurações do sistema
CREATE TABLE system_settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir configurações padrão
INSERT INTO system_settings (key, value, description) VALUES
('cashback_level_1', '0.10', 'Porcentagem de cashback nível 1 (10%)'),
('cashback_level_2', '0.05', 'Porcentagem de cashback nível 2 (5%)'),
('cashback_level_3', '0.02', 'Porcentagem de cashback nível 3 (2%)'),
('min_withdrawal_amount', '50.00', 'Valor mínimo para saque em R$');

-- Habilitar RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
-- Permitir leitura pública apenas para configurações
CREATE POLICY "Configurações públicas" ON system_settings
  FOR SELECT USING (true);

-- Permitir usuários verem apenas seus próprios dados
CREATE POLICY "Usuários veem próprio perfil" ON user_profiles
  FOR SELECT USING (auth.uid()::text = mocha_user_id);

CREATE POLICY "Transações próprias" ON transactions
  FOR SELECT USING (user_id = (SELECT id FROM user_profiles WHERE mocha_user_id = auth.uid()::text));

CREATE POLICY "Saques próprios" ON withdrawals
  FOR SELECT USING (user_id = (SELECT id FROM user_profiles WHERE mocha_user_id = auth.uid()::text));

-- Permissões para roles
GRANT SELECT ON system_settings TO anon, authenticated;
GRANT SELECT ON user_profiles TO anon, authenticated;
GRANT SELECT ON transactions TO anon, authenticated;
GRANT SELECT ON withdrawals TO anon, authenticated;