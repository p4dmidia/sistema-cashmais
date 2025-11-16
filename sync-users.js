// Script para sincronizar usuários do Supabase com D1
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hffxmntvtsimwlsapfod.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmZnhtbnR2dHNpbXdsc2FwZm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NDYwNDgsImV4cCI6MjA3ODMyMjA0OH0.Fb9Ey9l1YI_Znt4kH5605mxhPGYgML7DXZEJMY5grOc';

async function syncUsers() {
  console.log('🔄 Iniciando sincronização de usuários...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Buscar usuários do Supabase
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'affiliate')
      .eq('is_active', true);
    
    if (error) {
      console.error('❌ Erro ao buscar usuários do Supabase:', error);
      return;
    }
    
    console.log(`📊 Encontrados ${users.length} usuários afiliados no Supabase`);
    
    // Para cada usuário, sincronizar com D1
    for (const user of users) {
      console.log(`📝 Sincronizando usuário ${user.id} - CPF: ${user.cpf}`);
      
      try {
        // Buscar dados adicionais do afiliado
        const { data: affiliateData } = await supabase
          .from('affiliates')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (affiliateData) {
          // Criar no D1 via API
          const response = await fetch('http://localhost:5173/api/admin/sync-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user.id,
              cpf: user.cpf,
              email: affiliateData.email,
              full_name: affiliateData.full_name,
              referral_code: affiliateData.referral_code,
              is_active: user.is_active,
              is_verified: affiliateData.is_verified || true
            }),
          });
          
          if (response.ok) {
            console.log(`✅ Usuário ${user.id} sincronizado com sucesso`);
          } else {
            const error = await response.json();
            console.error(`❌ Erro ao sincronizar usuário ${user.id}:`, error);
          }
        } else {
          console.log(`⚠️ Dados do afiliado não encontrados para usuário ${user.id}`);
        }
        
        // Pequena pausa entre sincronizações
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Erro ao processar usuário ${user.id}:`, error);
      }
    }
    
    console.log('✅ Sincronização concluída!');
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
  }
}

// Como não temos API admin, vamos criar manualmente via SQL
async function createManualSync() {
  console.log('📝 Criando script SQL manual para sincronização...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Buscar usuários do Supabase
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'affiliate')
      .eq('is_active', true);
    
    if (error) {
      console.error('❌ Erro ao buscar usuários do Supabase:', error);
      return;
    }
    
    console.log(`📊 Encontrados ${users.length} usuários afiliados no Supabase`);
    
    // Gerar comandos SQL para inserir no D1
    let sqlCommands = '-- Script de sincronização D1\n';
    sqlCommands += '-- Execute este script no seu banco D1\n\n';
    
    for (const user of users) {
      // Buscar dados adicionais
      const { data: affiliateData } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (affiliateData && user.cpf) {
        // Gerar hash de senha padrão (usuários precisarão redefinir)
        const defaultPasswordHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/P.'; // "temp123"
        
        sqlCommands += `-- Usuário: ${user.id} - ${affiliateData.full_name}\n`;
        sqlCommands += `INSERT OR IGNORE INTO affiliates (id, full_name, cpf, email, password_hash, referral_code, sponsor_id, is_active, is_verified, created_at, updated_at) VALUES (
`;
        sqlCommands += `  ${user.id},
`;
        sqlCommands += `  '${affiliateData.full_name.replace(/'/g, "''")}',
`;
        sqlCommands += `  '${user.cpf}',
`;
        sqlCommands += `  '${affiliateData.email.replace(/'/g, "''")}',
`;
        sqlCommands += `  '${defaultPasswordHash}',
`;
        sqlCommands += `  '${affiliateData.referral_code}',
`;
        sqlCommands += `  ${affiliateData.sponsor_id || 'NULL'},
`;
        sqlCommands += `  1,
`;
        sqlCommands += `  ${affiliateData.is_verified ? 1 : 0},
`;
        sqlCommands += `  datetime('now'),
`;
        sqlCommands += `  datetime('now')
`;
        sqlCommands += `);\n\n`;
      }
    }
    
    // Salvar em arquivo
    import { writeFileSync } from 'fs';
    writeFileSync('sync-d1-users.sql', sqlCommands);
    
    console.log('✅ Script SQL gerado: sync-d1-users.sql');
    console.log('📋 Execute este script no seu banco D1 local com:');
    console.log(`   npx wrangler d1 execute 01995053-6d08-799d-99f1-d9898351a40a --local --file sync-d1-users.sql`);
    
  } catch (error) {
    console.error('❌ Erro ao gerar script:', error);
  }
}

// Executar
createManualSync();