// Carregar variáveis de ambiente
import { config } from 'dotenv'
config()

// Importar e executar o teste
import { createClient } from '@supabase/supabase-js'

// Usar service role key para bypass de RLS
const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

console.log('=== TESTE DE INSERÇÃO DE DADOS (SERVICE ROLE) ===')
console.log('Supabase URL:', supabaseUrl ? '✅ Configurada' : '❌ Não configurada')
console.log('Supabase Service Key:', supabaseServiceKey ? '✅ Configurada' : '❌ Não configurada')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Configurações do Supabase não encontradas!')
  console.log('💡 Dica: Você precisa da SERVICE_ROLE_KEY do Supabase para este teste')
  console.log('Obtenha em: Configurações do Projeto > API > service_role key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Teste de inserção de dados com service role (bypass RLS)
async function testInsertDataServiceRole() {
  console.log('🧪 Iniciando teste de inserção com Service Role (bypass RLS)...')
  
  const results = {}
  
  try {
    // 1. Testar inserção de empresa
    console.log('\n1️⃣ Testando inserção de empresa...')
    const companyData = {
      razao_social: 'Loja Teste Service Role LTDA',
      nome_fantasia: 'Loja Teste Service',
      cnpj: '12345678000196',
      email: 'service@lojateste.com',
      telefone: '1133333334',
      responsavel: 'Maria da Silva',
      senha_hash: '$2b$10$SERVICE_ROLE_HASH',
      endereco: 'Rua Service, 456 - São Paulo/SP',
      site_instagram: '@lojatesteservice',
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
    
    // 2. Testar inserção de transação
    if (results.company.success) {
      console.log('\n2️⃣ Testando inserção de transação...')
      const transactionData = {
        user_id: 1, // ID fictício para teste
        company_name: 'Loja Teste Service',
        purchase_value: 200.50,
        cashback_value: 20.05, // 10% do valor
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
        session_token: 'service_token_' + Math.random().toString(36).substr(2, 16),
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
        console.log('✅ Sessão inserida com sucesso, token:', sessionResult[0]?.session_token.substring(0, 15) + '...')
        results.session = { success: true, data: sessionResult[0] }
      }
    }
    
    // 4. Testar inserção de configurações de sistema
    console.log('\n4️⃣ Testando inserção de configurações de sistema...')
    const systemSettingsData = {
      key: 'service_test_setting_' + Math.random().toString(36).substr(2, 8),
      value: 'service_valor_teste_' + Math.random().toString(36).substr(2, 8),
      description: 'Configuração de teste com Service Role',
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
    
    // 5. Testar inserção de usuário admin
    console.log('\n5️⃣ Testando inserção de admin...')
    const adminData = {
      username: 'admin_service_' + Math.random().toString(36).substr(2, 6),
      email: 'admin.service@example.com',
      password_hash: '$2b$10$ADMIN_SERVICE_HASH',
      full_name: 'Admin Service Test',
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: adminResult, error: adminError } = await supabase
      .from('admin_users')
      .insert([adminData])
      .select()
    
    if (adminError) {
      console.error('❌ Erro ao inserir admin:', adminError.message)
      results.admin = { success: false, error: adminError.message }
    } else {
      console.log('✅ Admin inserido com sucesso:', adminResult[0]?.username, 'Email:', adminResult[0]?.email)
      results.admin = { success: true, data: adminResult[0] }
    }
    
    // 6. Verificar dados inseridos
    console.log('\n6️⃣ Verificando dados inseridos...')
    
    // Contar total de registros em cada tabela
    const tablesToCheck = ['companies', 'transactions', 'company_sessions', 'system_settings', 'admin_users']
    
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
    console.log('\n📋 Dados inseridos com Service Role:')
    
    if (results.company.success) {
      console.log(`🏢 Empresa: ${results.company.data.nome_fantasia} (ID: ${results.company.data.id})`)
    }
    if (results.transaction?.success) {
      console.log(`💳 Transação: R$ ${results.transaction.data.purchase_value} (Cashback: R$ ${results.transaction.data.cashback_value})`)
    }
    if (results.session?.success) {
      console.log(`🔑 Sessão: ${results.session.data.session_token.substring(0, 15)}...`)
    }
    if (results.settings.success) {
      console.log(`⚙️  Configuração: ${results.settings.data.key} = ${results.settings.data.value}`)
    }
    if (results.admin.success) {
      console.log(`👨‍💼 Admin: ${results.admin.data.username} (${results.admin.data.email})`)
    }
    
  } catch (error) {
    console.error('❌ Erro crítico:', error)
  }
  
  // Resumo final
  console.log('\n📈 RESUMO DO TESTE DE INSERÇÃO (SERVICE ROLE):')
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
  
  console.log('\n🎯 Teste de inserção com Service Role concluído!')
  return results
}

// Executar o teste
testInsertDataServiceRole().then(results => {
  console.log('\n🏁 Teste de inserção com Service Role finalizado!')
  process.exit(0)
}).catch(error => {
  console.error('❌ Erro crítico:', error)
  process.exit(1)
})