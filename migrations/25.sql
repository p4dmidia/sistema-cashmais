
-- Create test users for all systems
INSERT OR IGNORE INTO companies (id, razao_social, nome_fantasia, cnpj, email, telefone, responsavel, senha_hash, is_active) 
VALUES (1, 'Empresa Teste LTDA', 'Loja Teste', '98765432000100', 'teste@empresa.com', '11999999999', 'João Silva', '$2a$12$LQv3c1yqBwEHXk.JjKO0OeRT3jEPn0ZKR.K3rEPn9A3JxeQNzU9QG', 1);

INSERT OR IGNORE INTO affiliates (id, full_name, cpf, email, password_hash, referral_code, is_active, is_verified)
VALUES (1, 'Afiliado Teste', '12345678901', 'afiliado@teste.com', '$2a$12$LQv3c1yqBwEHXk.JjKO0OeRT3jEPn0ZKR.K3rEPn9A3JxeQNzU9QG', 'TESTE123', 1, 1);

INSERT OR IGNORE INTO company_cashiers (id, company_id, user_id, name, cpf, password_hash, is_active)
VALUES (1, 1, 1, 'Caixa Teste', '98765432109', '$2a$12$LQv3c1yqBwEHXk.JjKO0OeRT3jEPn0ZKR.K3rEPn9A3JxeQNzU9QG', 1);

INSERT OR IGNORE INTO user_profiles (mocha_user_id, cpf, role, is_active) 
VALUES ('cashier_1', '98765432109', 'cashier', 1);
