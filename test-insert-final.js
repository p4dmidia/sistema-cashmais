// Carregar variáveis de ambiente
import { config } from 'dotenv'
config()

// Importar e executar o teste
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

console.log('=== TESTE DE INSERÇÃO DE DADOS (FINAL CORRETO) ===')
console.log('Supabase URL:', process.env.VITE_SUPABASE_URL ? '✅ Configurada' : '❌ Não configurada')
console.log('Supabase Anon Key:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Não configurada')

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Configurações do Supabase não encontradas!')
  process.exit(1)
}

// Teste de inserção de dados com estrutura correta e RLS
async function testInsertDataFinal() {
  console.log('🧪 Iniciando teste de inserção de dados final...')
  console.log('⚠️  IMPORTANTE: Este teste usará o service role key para bypass RLS')
  
  const results = {}
  
  try {
    // 1. Testar inserção de empresa primeiro (sem RLS)
    console.log('\n1️⃣ Testando inserção de empresa...')
    const companyData = {
      razao_social: 'Loja Teste LTDA',
      nome_fantasia: 'Loja Teste',
      cnpj: '12345678000195',
      email: 'contato@lojateste.com',
      telefone: '1133333333',
      responsavel: 'João da Silva',
      senha_hash: '$2b$10$HASH_TESTE', // Simulando hash bcrypt
      endereco: 'Rua Teste, 123 - São Paulo/SP',
      site_instagram: '@lojateste',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: companyResult, error: companyError } = await supabase
      .from('companies')
      .insert([companyData])
      .select()
    
    if (companyError) {
      console.error('❌ Erro ao inserir empresa:', companyError.message)
      results.company = { success: false, error: companyError.message }
    } else {
      console.log('✅ Empresa inserida com sucesso:', companyResult[0]?.nome_fantasia, 'ID:', companyResult[0]?.id)
      results.company = { success: true, data: companyResult[0] }
    }
    
    // 2. Testar inserção de transação (se empresa foi inserida)
    if (results.company.success) {
      console.log('\n2️⃣ Testando inserção de transação...')
      const transactionData = {
        user_id: 1, // Usar ID 1 como teste (pode não existir, mas vamos tentar)
        company_name: 'Loja Teste',
        purchase_value: 150.75,
        cashback_value: 15.08, // 10% do valor
        level_earned: 1,
        transaction_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data: transactionResult, error: transactionError } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select()
      
      if (transactionError) {
        console.error('❌ Erro ao inserir transação:', transactionError.message)
        results.transaction = { success: false, error: transactionError.message }
      } else {
        console.log('✅ Transação inserida com sucesso: R$', transactionResult[0]?.purchase_value, 'Cashback: R$', transactionResult[0]?.cashback_value)
        results.transaction = { success: true, data: transactionResult[0] }
      }
    }
    
    // 3. Testar inserção de sessão de empresa
    if (results.company.success) {
      console.log('\n3️⃣ Testando inserção de sessão de empresa...')
      const sessionData = {
        company_id: results.company.data.id,
        session_token: 'token_' + Math.random().toString(36).substr(2, 16),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
        created_at: new Date().toISOString()
      }
      
      const { data: sessionResult, error: sessionError } = await supabase
        .from('company_sessions')
        .insert([sessionData])
        .select()
      
      if (sessionError) {
        console.error('❌ Erro ao inserir sessão:', sessionError.message)
        results.session = { success: false, error: sessionError.message }
      } else {
        console.log('✅ Sessão inserida com sucesso, token:', sessionResult[0]?.session_token.substring(0, 10) + '...')
        results.session = { success: true, data: sessionResult[0] }
      }
    }
    
    // 4. Testar inserção de token de redefinição de senha
    if (results.company.success) {
      console.log('\n4️⃣ Testando inserção de token de redefinição...')
      const tokenData = {
        company_id: results.company.data.id,
        token: 'reset_' + Math.random().toString(36).substr(2, 16),
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hora
        used: false,
        created_at: new Date().toISOString()
      }
      
      const { data: tokenResult, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .insert([tokenData])
        .select()
      
      if (tokenError) {
        console.error('❌ Erro ao inserir token:', tokenError.message)
        results.token = { success: false, error: tokenError.message }
      } else {
        console.log('✅ Token inserido com sucesso:', tokenResult[0]?.token.substring(0, 10) + '...')
        results.token = { success: true, data: tokenResult[0] }
      }
    }
    
    // 5. Testar inserção de configurações de sistema
    console.log('\n5️⃣ Testando inserção de configurações de sistema...')
    const systemSettingsData = {
      key: 'test_setting_' + Math.random().toString(36).substr(2, 8),
      value: 'valor_teste_' + Math.random().toString(36).substr(2, 8),
      description: 'Configuração de teste',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: settingsResult, error: settingsError } = await supabase
      .from('system_settings')
      .insert([systemSettingsData])
      .select()
    
    if (settingsError) {
      console.error('❌ Erro ao inserir configuração:', settingsError.message)
      results.settings = { success: false, error: settingsError.message }
    } else {
      console.log('✅ Configuração inserida com sucesso:', settingsResult[0]?.key, '=', settingsResult[0]?.value)
      results.settings = { success: true, data: settingsResult[0] }
    }
    
    // 6. Verificar dados inseridos
    console.log('\n6️⃣ Verificando dados inseridos...')
    
    // Contar total de registros em cada tabela
    const tablesToCheck = ['companies', 'transactions', 'company_sessions', 'password_reset_tokens', 'system_settings']
    
    for (const table of tablesToCheck) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.error(`❌ Erro ao contar ${table}:`, error.message)
      } else {
        console.log(`📊 Tabela ${table}: ${count} registros`)
      }
    }
    
    // Listar dados inseridos
    console.log('\n📋 Dados inseridos:')
    
    if (results.company.success) {
      console.log(`🏢 Empresa: ${results.company.data.nome_fantasia} (ID: ${results.company.data.id})`)
    }
    if (results.transaction?.success) {
      console.log(`💳 Transação: R$ ${results.transaction.data.purchase_value} (Cashback: R$ ${results.transaction.data.cashback_value})`)
    }
    if (results.session?.success) {
      console.log(`🔑 Sessão: ${results.session.data.session_token.substring(0, 10)}...`)
    }
    if (results.token?.success) {
      console.log(`🔄 Token: ${results.token.data.token.substring(0, 10)}...`)
    }
    if (results.settings.success) {
      console.log(`⚙️  Configuração: ${results.settings.data.key} = ${results.settings.data.value}`)
    }
    
  } catch (error) {
    console.error('❌ Erro crítico:', error)
  }
  
  // Resumo final
  console.log('\n📈 RESUMO DO TESTE DE INSERÇÃO:')
  console.log('=====================================')
  
  const successful = Object.values(results).filter(r => r.success).length
  const failed = Object.values(results).filter(r => !r.success).length
  
  console.log(`✅ Inserções bem-sucedidas: ${successful}`)
  console.log(`❌ Inserções com erro: ${failed}`)
  console.log(`📊 Total de testes: ${Object.keys(results).length}`)
  
  if (failed > 0) {
    console.log('\n❌ ERROS ENCONTRADOS:')
    Object.entries(results)
      .filter(([_, result]) => !result.success)
      .forEach(([test, result]) => {
        console.log(`  - ${test}: ${result.error}`)
      })
  }
  
  console.log('\n🎯 Teste de inserção concluído!')
  return results
}

// Executar o teste
testInsertDataFinal().then(results => {
  console.log('\n🏁 Teste de inserção finalizado!')
  process.exit(0)
}).catch(error => {
  console.error('❌ Erro crítico:', error)
  process.exit(1)
})