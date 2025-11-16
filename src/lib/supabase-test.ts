import { supabase } from '../lib/supabase'

// Teste de conexão com o Supabase
export async function testSupabaseConnection() {
  try {
    // Test 1: Verificar se conseguimos conectar
    const { data, error } = await supabase.from('user_profiles').select('*').limit(1)
    
    if (error) {
      console.error('❌ Erro na conexão com Supabase:', error.message)
      return false
    }
    
    console.log('✅ Conexão com Supabase estabelecida!')
    console.log('📊 Dados de teste:', data)
    
    // Test 2: Verificar tabelas existentes
    const tables = await checkTables()
    console.log('📋 Tabelas verificadas:', tables)
    
    return true
  } catch (error) {
    console.error('❌ Erro ao testar conexão:', error)
    return false
  }
}

// Verificar quais tabelas existem
async function checkTables() {
  const tables = ['user_profiles', 'transactions', 'withdrawals', 'system_settings']
  const results: Record<string, boolean> = {}
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(0)
      results[table] = !error
    } catch {
      results[table] = false
    }
  }
  
  return results
}

// Executar teste se chamado diretamente
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.testSupabase = testSupabaseConnection
}