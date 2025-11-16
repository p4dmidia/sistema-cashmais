-- Criar tabela de afiliados
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
    last_access_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_affiliates_cpf ON affiliates(cpf);
CREATE INDEX idx_affiliates_email ON affiliates(email);
CREATE INDEX idx_affiliates_referral_code ON affiliates(referral_code);
CREATE INDEX idx_affiliates_sponsor_id ON affiliates(sponsor_id);
CREATE INDEX idx_affiliates_is_active ON affiliates(is_active);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_affiliates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_affiliates_updated_at
    BEFORE UPDATE ON affiliates
    FOR EACH ROW
    EXECUTE FUNCTION update_affiliates_updated_at();

-- RLS (Row Level Security)
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
-- Permitir leitura pública de afiliados ativos
CREATE POLICY "Permitir leitura de afiliados ativos" ON affiliates
    FOR SELECT
    USING (is_active = true);

-- Permitir inserção pública (para cadastro)
CREATE POLICY "Permitir cadastro de afiliados" ON affiliates
    FOR INSERT
    WITH CHECK (true);

-- Conceder permissões
GRANT SELECT ON affiliates TO anon;
GRANT SELECT ON affiliates TO authenticated;
GRANT INSERT ON affiliates TO anon;
GRANT INSERT ON affiliates TO authenticated;