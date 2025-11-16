-- Adicionar permissões para inserção em user_profiles durante cadastro de afiliados
-- Isso é necessário porque o backend cria perfis automaticamente

-- Remover políticas restritivas existentes (se houver)
DROP POLICY IF EXISTS "Permitir inserção pública" ON user_profiles;
DROP POLICY IF EXISTS "Permitir inserção de perfis" ON user_profiles;

-- Criar política que permite inserção pública (necessária para cadastro)
CREATE POLICY "Permitir inserção pública de perfis" ON user_profiles
    FOR INSERT
    WITH CHECK (true);

-- Garantir permissões de inserção
GRANT INSERT ON user_profiles TO anon;
GRANT INSERT ON user_profiles TO authenticated;

-- Verificar permissões atuais
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'user_profiles' AND grantee IN ('anon', 'authenticated');