-- Verificar permissões atuais das tabelas
SELECT 
    table_name,
    grantee,
    privilege_type 
FROM 
    information_schema.role_table_grants 
WHERE 
    table_schema = 'public' 
    AND grantee IN ('anon', 'authenticated')
ORDER BY 
    table_name, grantee;

-- Verificar políticas RLS ativas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM 
    pg_policies 
WHERE 
    schemaname = 'public'
ORDER BY 
    tablename, policyname;