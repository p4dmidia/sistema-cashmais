// Teste simples de conexão Supabase
export async function testSupabaseConnection() {
  try {
    // Importar dinamicamente para evitar erros de build
    const { supabase } = await import('../lib/supabase')
    
    console.log('🧪 Testando conexão com Supabase...')
    
    // Teste básico - listar tabelas do schema public
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Erro na conexão:', error.message)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Conexão estabelecida com sucesso!')
    console.log('📊 Dados retornados:', data)
    
    return { success: true, data }
  } catch (error) {
    console.error('❌ Erro ao testar conexão:', error)
    return { success: false, error: (error as Error).message }
  }
}

// Executar teste
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.testSupabase = testSupabaseConnection
  
  // Testar automaticamente após 1 segundo
  setTimeout(() => {
    console.log('🚀 Iniciando teste automático de conexão...')
    testSupabaseConnection()
  }, 1000)
}