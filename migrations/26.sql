
-- Update existing users with known password "123456" (hash: $2a$12$LQv3c1yqBwEHXk.JjKO0OeRT3jEPn0ZKR.K3rEPn0A3JxeQNzU9QG)

-- Update company password
UPDATE companies SET senha_hash = '$2a$12$LQv3c1yqBwEHXk.JjKO0OeRT3jEPn0ZKR.K3rEPn0A3JxeQNzU9QG' WHERE id = 1;

-- Update affiliate password  
UPDATE affiliates SET password_hash = '$2a$12$LQv3c1yqBwEHXk.JjKO0OeRT3jEPn0ZKR.K3rEPn0A3JxeQNzU9QG' WHERE id = 1;

-- Update cashier password
UPDATE company_cashiers SET password_hash = '$2a$12$LQv3c1yqBwEHXk.JjKO0OeRT3jEPn0ZKR.K3rEPn0A3JxeQNzU9QG' WHERE id = 1;

-- Create additional test users with known CPF/CNPJ if they don't exist
INSERT OR IGNORE INTO companies (razao_social, nome_fantasia, cnpj, email, telefone, responsavel, senha_hash, is_active) 
VALUES ('Empresa Teste Nova', 'Loja Teste Nova', '98765432000100', 'teste2@empresa.com', '11999999998', 'João Silva', '$2a$12$LQv3c1yqBwEHXk.JjKO0OeRT3jEPn0ZKR.K3rEPn0A3JxeQNzU9QG', 1);

INSERT OR IGNORE INTO affiliates (full_name, cpf, email, password_hash, referral_code, is_active, is_verified)
VALUES ('Afiliado Teste Novo', '12345678901', 'afiliado2@teste.com', '$2a$12$LQv3c1yqBwEHXk.JjKO0OeRT3jEPn0ZKR.K3rEPn0A3JxeQNzU9QG', 'TESTE456', 1, 1);
