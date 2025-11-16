// Carregar variáveis de ambiente
import { config } from 'dotenv'
config()

// Importar e executar o teste
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkTableSchema() {
  console.log('🔍 Verificando schema das tabelas principais...')
  
  const tables = ['user_profiles', 'companies', 'transactions', 'withdrawals']
  
  for (const table of tables) {
    console.log(`\n📋 Schema da tabela ${table}:`)
    
    try {
      // Primeiro, tentar selecionar um registro para ver as colunas
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        console.error(`❌ Erro ao consultar ${table}:`, error.message)
      } else if (data && data.length > 0) {
        console.log('✅ Colunas encontradas:')
        Object.keys(data[0]).forEach(col => console.log(`  - ${col}`))
      } else {
        console.log('📊 Tabela vazia, consultando estrutura...')
        
        // Consultar estrutura via SQL
        const { data: structure, error: structError } = await supabase
          .sql(`SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = '${table}' 
                ORDER BY ordinal_position`)
        
        if (structError) {
          console.error('❌ Erro ao obter estrutura:', structError.message)
        } else {
          console.log('✅ Estrutura da tabela:')
          structure.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`)
          })
        }
      }
    } catch (error) {
      console.error(`❌ Erro crítico ao verificar ${table}:`, error)
    }
  }
}

// Executar verificação
checkTableSchema().then(() => {
  console.log('\n🏁 Verificação de schema concluída!')
  process.exit(0)
}).catch(error => {
  console.error('❌ Erro crítico:', error)
  process.exit(1)
})