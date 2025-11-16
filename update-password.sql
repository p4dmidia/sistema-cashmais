-- Atualizar senha do usuário de teste
UPDATE affiliates SET password_hash = '$2b$12$U1/r.8OkG25mytjRRXrAcuXwYU7t814.upeY497oHHh..paWTpoZS' WHERE cpf = '12345678909';

-- Verificar se atualizou
SELECT cpf, email, password_hash FROM affiliates WHERE cpf = '12345678909';