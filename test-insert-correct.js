// Carregar variáveis de ambiente
import { config } from 'dotenv'
config()

// Importar e executar o teste
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

console.log('=== TESTE DE INSERÇÃO DE DADOS (CORRETO) ===')
console.log('Supabase URL:', process.env.VITE_SUPABASE_URL ? '✅ Configurada' : '❌ Não configurada')
console.log('Supabase Anon Key:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Não configurada')

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Configurações do Supabase não encontradas!')
  process.exit(1)
}

// Teste de inserção de dados com estrutura correta
async function testInsertDataCorrect() {
  console.log('🧪 Iniciando teste de inserção de dados com estrutura correta...')
  
  const results = {}
  
  try {
    // 1. Testar inserção de usuário com estrutura correta
    console.log('\n1️⃣ Testando inserção de usuário...')
    const userData = {
      mocha_user_id: 'user_test_' + Math.random().toString(36).substr(2, 9),
      cpf: '12345678901',
      role: 'affiliate',
      is_active: true,
      company_name: 'Empresa Teste LTDA',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: userResult, error: userError } = await supabase
      .from('user_profiles')
      .insert([userData])
      .select()
    
    if (userError) {
      console.error('❌ Erro ao inserir usuário:', userError.message)
      results.user = { success: false, error: userError.message }
    } else {
      console.log('✅ Usuário inserido com sucesso ID:', userResult[0]?.id, 'Mocha ID:', userResult[0]?.mocha_user_id)
      results.user = { success: true, data: userResult[0] }
    }
    
    // 2. Testar inserção de empresa com estrutura correta
    console.log('\n2️⃣ Testando inserção de empresa...')
    const companyData = {
      razao_social: 'Loja Teste LTDA',
      nome_fantasia: 'Loja Teste',
      cnpj: '12345678000195',
      email: 'contato@lojateste.com',
      telefone: '1133333333',
      endereco_completo: 'Rua Teste, 123 - São Paulo/SP',
      status: 'active',
      comissao_percentual: 5.5,
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
      console.log('✅ Empresa inserida com sucesso:', companyResult[0]?.nome_fantasia, 'CNPJ:', companyResult[0]?.cnpj)
      results.company = { success: true, data: companyResult[0] }
    }
    
    // 3. Testar inserção de transação (se usuário foi inserido)
    if (results.user.success) {
      console.log('\n3️⃣ Testando inserção de transação...')
      const transactionData = {
        user_id: results.user.data.id,
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
      
      // 4. Testar inserção de configurações do usuário
      console.log('\n4️⃣ Testando inserção de configurações do usuário...')
      const userSettingsData = {
        user_id: results.user.data.id,
        pix_key: 'joao.silva@example.com',
        leg_preference: 'automatic',
        is_active_this_month: true,
        total_earnings: 0,
        available_balance: 0,
        frozen_balance: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data: settingsResult, error: settingsError } = await supabase
        .from('user_settings')
        .insert([userSettingsData])
        .select()
      
      if (settingsError) {
        console.error('❌ Erro ao inserir configurações:', settingsError.message)
        results.settings = { success: false, error: settingsError.message }
      } else {
        console.log('✅ Configurações inseridas com sucesso para usuário ID:', settingsResult[0]?.user_id)
        results.settings = { success: true, data: settingsResult[0] }
      }
      
      // 5. Testar inserção de saque
      console.log('\n5️⃣ Testando inserção de saque...')
      const withdrawalData = {
        user_id: results.user.data.id,
        amount_requested: 50.00,
        fee_amount: 1.50,
        net_amount: 48.50,
        status: 'pending',
        pix_key: 'joao.silva@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data: withdrawalResult, error: withdrawalError } = await supabase
        .from('withdrawals')
        .insert([withdrawalData])
        .select()
      
      if (withdrawalError) {
        console.error('❌ Erro ao inserir saque:', withdrawalError.message)
        results.withdrawal = { success: false, error: withdrawalError.message }
      } else {
        console.log('✅ Saque inserido com sucesso: R$', withdrawalResult[0]?.amount_requested, 'Status:', withdrawalResult[0]?.status)
        results.withdrawal = { success: true, data: withdrawalResult[0] }
      }
    }
    
    // 6. Verificar dados inseridos
    console.log('\n6️⃣ Verificando dados inseridos...')
    
    // Contar total de registros em cada tabela
    const tablesToCheck = ['user_profiles', 'companies', 'transactions', 'user_settings', 'withdrawals']
    
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
    
    if (results.user.success) {
      console.log(`👤 Usuário: ID ${results.user.data.id} (Mocha: ${results.user.data.mocha_user_id})`)
    }
    if (results.company.success) {
      console.log(`🏢 Empresa: ${results.company.data.nome_fantasia} (${results.company.data.cnpj})`)
    }
    if (results.transaction?.success) {
      console.log(`💳 Transação: R$ ${results.transaction.data.purchase_value} (Cashback: R$ ${results.transaction.data.cashback_value})`)
    }
    if (results.settings?.success) {
      console.log(`⚙️  Configurações: PIX ${results.settings.data.pix_key}`)
    }
    if (results.withdrawal?.success) {
      console.log(`💰 Saque: R$ ${results.withdrawal.data.amount_requested} (${results.withdrawal.data.status})`)
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
testInsertDataCorrect().then(results => {
  console.log('\n🏁 Teste de inserção finalizado!')
  process.exit(0)
}).catch(error => {
  console.error('❌ Erro crítico:', error)
  process.exit(1)
})