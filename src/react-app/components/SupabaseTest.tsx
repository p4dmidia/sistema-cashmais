import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error'>('testing')
  const [tableStatus, setTableStatus] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string>('')

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      // Testar conexão
      const { error: connError } = await supabase.from('user_profiles').select('*').limit(1)
      
      if (connError) {
        setConnectionStatus('error')
        setError(connError.message)
        return
      }

      setConnectionStatus('success')

      // Verificar tabelas
      await checkTables()
    } catch (err) {
      setConnectionStatus('error')
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  const checkTables = async () => {
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
    
    setTableStatus(results)
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Teste de Conexão Supabase</h2>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Conexão:</span>
          <span className={`px-2 py-1 rounded text-sm font-medium ${
            connectionStatus === 'testing' ? 'bg-yellow-100 text-yellow-800' :
            connectionStatus === 'success' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            {connectionStatus === 'testing' ? 'Testando...' :
             connectionStatus === 'success' ? '✅ Conectado' :
             '❌ Erro'}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {Object.keys(tableStatus).length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Tabelas:</h3>
            <div className="space-y-1">
              {Object.entries(tableStatus).map(([table, exists]) => (
                <div key={table} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{table}:</span>
                  <span className={exists ? 'text-green-600' : 'text-red-600'}>
                    {exists ? '✅' : '❌'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button 
          onClick={testConnection}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
        >
          Testar Novamente
        </button>
      </div>
    </div>
  )
}