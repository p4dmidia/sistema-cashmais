import { SupabaseTest } from '../components/SupabaseTest'

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Teste de Integração Supabase
        </h1>
        <SupabaseTest />
        
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Instruções:</h2>
          <div className="space-y-2 text-gray-600">
            <p>1. Se a conexão mostrar ✅, está tudo certo!</p>
            <p>2. Se mostrar ❌, verifique:</p>
            <ul className="ml-6 list-disc">
              <li>Se as chaves estão corretas no arquivo .env</li>
              <li>Se as tabelas foram criadas no Supabase</li>
              <li>Se o projeto está rodando (npm run dev)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}