import { supabase } from '../lib/supabase'

// Teste completo de todas as tabelas do Supabase
export async function testAllTables() {
  console.log('🧪 Iniciando teste completo de todas as tabelas...')
  
  const tables = [
    'user_profiles',
    'transactions', 
    'withdrawals',
    'user_settings',
    'network_structure',
    'companies',
    'company_sessions',
    'password_reset_tokens',
    'company_cashiers',
    'customer_coupons',
    'company_purchases',
    'company_cashback_config',
    'cashier_sessions',
    'admin_users',
    'admin_sessions',
    'admin_audit_logs',
    'system_settings',
    'cashback_config'
  ]
  
  const results: Record<string, { exists: boolean; count?: number; error?: string }> = {}
  
  for (const table of tables) {
    try {
      console.log(`🔍 Testando tabela: ${table}`)
      
      // Testar se a tabela existe e pode ser consultada
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.error(`❌ Erro na tabela ${table}:`, error.message)
        results[table] = { exists: false, error: error.message }
      } else {
        console.log(`✅ Tabela ${table} OK - ${count} registros`)
        results[table] = { exists: true, count }
      }
    } catch (error) {
      console.error(`❌ Erro crítico na tabela ${table}:`, error)
      results[table] = { 
        exists: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }
    }
  }
  
  // Testar dados iniciais
  console.log('📊 Testando dados iniciais...')
  
  try {
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('username, email, full_name')
      .limit(1)
    
    if (!adminError && adminData && adminData.length > 0) {
      console.log('✅ Admin padrão encontrado:', adminData[0])
    } else {
      console.log('⚠️ Admin padrão não encontrado ou erro:', adminError?.message)
    }
    
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('key, value')
      .limit(5)
    
    if (!settingsError && settingsData) {
      console.log('✅ Configurações do sistema encontradas:', settingsData.length)
    } else {
      console.log('⚠️ Configurações não encontradas ou erro:', settingsError?.message)
    }
    
    const { data: cashbackData, error: cashbackError } = await supabase
      .from('cashback_config')
      .select('level, percentage')
      .order('level')
    
    if (!cashbackError && cashbackData) {
      console.log('✅ Configurações de cashback:', cashbackData)
    } else {
      console.log('⚠️ Configurações de cashback não encontradas:', cashbackError?.message)
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar dados iniciais:', error)
  }
  
  // Resumo final
  console.log('\n📋 RESUMO DO TESTE:')
  console.log('=====================================')
  
  const successful = Object.values(results).filter(r => r.exists).length
  const failed = Object.values(results).filter(r => !r.exists).length
  
  console.log(`✅ Tabelas funcionando: ${successful}`)
  console.log(`❌ Tabelas com erro: ${failed}`)
  console.log(`📊 Total de tabelas: ${tables.length}`)
  
  if (failed > 0) {
    console.log('\n❌ TABELAS COM ERRO:')
    Object.entries(results)
      .filter(([_, result]) => !result.exists)
      .forEach(([table, result]) => {
        console.log(`  - ${table}: ${result.error}`)
      })
  }
  
  console.log('\n🎯 Teste concluído!')
  return results
}

// Testar conexão com uma query simples primeiro
export async function testBasicConnection() {
  try {
    console.log('🔌 Testando conexão básica...')
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Erro na conexão básica:', error.message)
      return false
    }
    
    console.log('✅ Conexão básica OK')
    console.log('📊 Dados retornados:', data)
    return true
    
  } catch (error) {
    console.error('❌ Erro crítico na conexão:', error)
    return false
  }
}

// Executar testes
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.testSupabaseTables = testAllTables
  // @ts-ignore
  window.testBasicConnection = testBasicConnection
  
  console.log('🚀 Funções de teste disponíveis:')
  console.log('  - testBasicConnection() - Testa conexão básica')
  console.log('  - testSupabaseTables() - Testa todas as tabelas')
}