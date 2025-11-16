-- Script SQL para sincronizar usuários do Supabase com D1
-- Execute este script no seu banco D1 local

-- Inserir usuário de teste (CPF: 12345678909)
INSERT OR IGNORE INTO affiliates (full_name, cpf, email, password_hash, referral_code, sponsor_id, is_active, is_verified, created_at, updated_at) VALUES (
  'Teste Usuário',
  '12345678909',
  'teste@example.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/P.', -- senha: temp123
  'TESTE123',
  NULL,
  1,
  1,
  datetime('now'),
  datetime('now')
);

-- Inserir outro usuário de teste
INSERT OR IGNORE INTO affiliates (full_name, cpf, email, password_hash, referral_code, sponsor_id, is_active, is_verified, created_at, updated_at) VALUES (
  'Afiliado Exemplo',
  '98765432100',
  'afiliado@example.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/P.', -- senha: temp123
  'EXEMPLO1',
  NULL,
  1,
  1,
  datetime('now'),
  datetime('now')
);

-- Verificar usuários inseridos
SELECT * FROM affiliates WHERE is_active = 1;