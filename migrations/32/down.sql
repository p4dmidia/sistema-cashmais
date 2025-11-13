
-- Reverter: desativar admin padrão
UPDATE admin_users SET is_active = 0 WHERE username = 'admin';
