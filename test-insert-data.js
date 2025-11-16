// Carregar variáveis de ambiente
import { config } from 'dotenv'
config()

// Importar e executar o teste
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''

console.log('=== TESTE DE INSERÇÃO DE DADOS ===')
console.log('Supabase URL:', supabaseUrl ? '✅ Configurada' : '❌ Não configurada')
console.log('Supabase Anon Key:', supabaseAnonKey ? '✅ Configurada' : '❌ Não configurada')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Configurações do Supabase não encontradas!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Função para gerar CPF válido para teste
function generateCPF() {
  const cpf = Array.from({length: 9}, () => Math.floor(Math.random() * 9))
  const dv1 = cpf.reduce((acc, val, i) => acc + val * (10 - i), 0) % 11
  const dv2 = [...cpf, dv1 < 2 ? 0 : 11 - dv1].reduce((acc, val, i) => acc + val * (11 - i), 0) % 11
  return [...cpf, dv1 < 2 ? 0 : 11 - dv1, dv2 < 2 ? 0 : 11 - dv2].join('')
}

// Função para gerar CNPJ válido para teste
function generateCNPJ() {
  const cnpj = Array.from({length: 12}, () => Math.floor(Math.random() * 9))
  const dv1 = cnpj.reduce((acc, val, i) => acc + val * ([5,4,3,2,9,8,7,6,5,4,3,2][i]), 0) % 11
  const dv2 = [...cnpj, dv1 < 2 ? 0 : 11 - dv1].reduce((acc, val, i) => acc + val * ([6,5,4,3,2,9,8,7,6,5,4,3,2][i]), 0) % 11
  return [...cnpj, dv1 < 2 ? 0 : 11 - dv1, dv2 < 2 ? 0 : 11 - dv2].join('')
}

// Teste de inserção de dados
async function testInsertData() {
  console.log('🧪 Iniciando teste de inserção de dados...')
  
  const results = {}
  
  try {
    // 1. Testar inserção de usuário
    console.log('\n1️⃣ Testando inserção de usuário...')
    const userData = {
      id: crypto.randomUUID(),
      full_name: 'João Silva Teste',
      email: 'joao.teste@example.com',
      cpf: generateCPF(),
      phone: '11999999999',
      birth_date: '1990-01-15',
      status: 'active',
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
      console.log('✅ Usuário inserido com sucesso:', userResult[0]?.full_name)
      results.user = { success: true, data: userResult[0] }
    }
    
    // 2. Testar inserção de empresa
    console.log('\n2️⃣ Testando inserção de empresa...')
    const companyData = {
      id: crypto.randomUUID(),
      name: 'Loja Teste LTDA',
      cnpj: generateCNPJ(),
      email: 'contato@lojateste.com',
      phone: '1133333333',
      address: 'Rua Teste, 123 - São Paulo/SP',
      status: 'active',
      commission_rate: 5.5,
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
      console.log('✅ Empresa inserida com sucesso:', companyResult[0]?.name)
      results.company = { success: true, data: companyResult[0] }
    }
    
    // 3. Testar inserção de transação (se usuário e empresa foram inseridos)
    if (results.user.success && results.company.success) {
      console.log('\n3️⃣ Testando inserção de transação...')
      const transactionData = {
        id: crypto.randomUUID(),
        user_id: results.user.data.id,
        company_id: results.company.data.id,
        amount: 150.75,
        cashback_amount: 15.08, // 10% do valor
        status: 'approved',
        description: 'Compra teste - Supermercado',
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
        console.log('✅ Transação inserida com sucesso: R$', transactionResult[0]?.amount)
        results.transaction = { success: true, data: transactionResult[0] }
      }
      
      // 4. Testar inserção de saque
      console.log('\n4️⃣ Testando inserção de saque...')
      const withdrawalData = {
        id: crypto.randomUUID(),
        user_id: results.user.data.id,
        amount: 50.00,
        status: 'pending',
        bank_name: 'Banco do Brasil',
        bank_branch: '1234',
        bank_account: '56789-0',
        account_holder: 'João Silva Teste',
        cpf: results.user.data.cpf,
        requested_at: new Date().toISOString(),
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
        console.log('✅ Saque inserido com sucesso: R$', withdrawalResult[0]?.amount)
        results.withdrawal = { success: true, data: withdrawalResult[0] }
      }
    }
    
    // 5. Verificar dados inseridos
    console.log('\n5️⃣ Verificando dados inseridos...')
    
    // Contar total de registros em cada tabela
    const tablesToCheck = ['user_profiles', 'companies', 'transactions', 'withdrawals']
    
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
      console.log(`👤 Usuário: ${results.user.data.full_name} (${results.user.data.email})`)
    }
    if (results.company.success) {
      console.log(`🏢 Empresa: ${results.company.data.name} (${results.company.data.cnpj})`)
    }
    if (results.transaction?.success) {
      console.log(`💳 Transação: R$ ${results.transaction.data.amount} (Cashback: R$ ${results.transaction.data.cashback_amount})`)
    }
    if (results.withdrawal?.success) {
      console.log(`💰 Saque: R$ ${results.withdrawal.data.amount} (${results.withdrawal.data.status})`)
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
testInsertData().then(results => {
  console.log('\n🏁 Teste de inserção finalizado!')
  process.exit(0)
}).catch(error => {
  console.error('❌ Erro crítico:', error)
  process.exit(1)
})