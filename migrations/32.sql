
-- Criar usuário admin padrão se não existir
INSERT OR IGNORE INTO admin_users (username, email, password_hash, full_name, is_active) 
VALUES ('admin', 'admin@cashmais.com.br', '$2b$10$rOZxQQCQGGGGGGGGGGGGGuKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK', 'Administrador', 1);

-- Verificar se existe pelo menos um admin ativo
UPDATE admin_users SET is_active = 1 WHERE username = 'admin';
