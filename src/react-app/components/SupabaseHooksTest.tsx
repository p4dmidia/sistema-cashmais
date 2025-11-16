import React, { useState } from 'react';
import { 
  useAffiliateAuth, 
  useAffiliateData, 
  useAffiliateTransactions, 
  useAffiliateNetwork, 
  useWithdrawals, 
  useCompanies, 
  useDashboardStats 
} from '../../hooks/useSupabase';

export function SupabaseHooksTest() {
  const [testAffiliateId, setTestAffiliateId] = useState<number | null>(1); // ID de teste
  const [loginCpf, setLoginCpf] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Test authentication hook
  const { 
    affiliate: currentAffiliate, 
    loading: authLoading, 
    error: authError, 
    login, 
    logout 
  } = useAffiliateAuth();

  // Test data hooks
  const { data: affiliateData, loading: dataLoading, error: dataError } = useAffiliateData(testAffiliateId);
  const { transactions, loading: transactionsLoading, error: transactionsError } = useAffiliateTransactions(testAffiliateId);
  const { network, loading: networkLoading, error: networkError } = useAffiliateNetwork(testAffiliateId);
  const { withdrawals, loading: withdrawalsLoading, error: withdrawalsError, createWithdrawal } = useWithdrawals(testAffiliateId);

  // Test general hooks
  const { companies, loading: companiesLoading, error: companiesError } = useCompanies();
  const { stats, loading: statsLoading, error: statsError } = useDashboardStats();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(loginCpf, loginPassword);
    if (result.success) {
      alert('Login realizado com sucesso!');
    } else {
      alert('Erro no login: ' + result.error);
    }
  };

  const handleLogout = async () => {
    await logout();
    alert('Logout realizado com sucesso!');
  };

  const handleWithdrawal = async () => {
    const amount = prompt('Valor do saque:');
    const pixKey = prompt('Chave PIX:');
    
    if (amount && pixKey && testAffiliateId) {
      const result = await createWithdrawal(parseFloat(amount), pixKey);
      if (result.success) {
        alert('Saque solicitado com sucesso!');
      } else {
        alert('Erro ao solicitar saque: ' + result.error);
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Teste dos Hooks Supabase</h2>

      {/* Authentication Test */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-blue-800">Autenticação</h3>
        
        {authLoading && <p className="text-blue-600">Verificando sessão...</p>}
        {authError && <p className="text-red-600">Erro: {authError}</p>}
        
        {currentAffiliate ? (
          <div className="space-y-2">
            <p className="text-green-600 font-medium">✅ Afiliado logado: {currentAffiliate.full_name}</p>
            <p className="text-gray-600">CPF: {currentAffiliate.cpf}</p>
            <p className="text-gray-600">Email: {currentAffiliate.email}</p>
            <button 
              onClick={handleLogout}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">CPF:</label>
              <input
                type="text"
                value={loginCpf}
                onChange={(e) => setLoginCpf(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Digite seu CPF"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Senha:</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Digite sua senha"
              />
            </div>
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Login
            </button>
          </form>
        )}
      </div>

      {/* Affiliate Data Test */}
      <div className="mb-8 p-4 bg-green-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-green-800">Dados do Afiliado (ID: {testAffiliateId})</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">ID do Afiliado:</label>
          <input
            type="number"
            value={testAffiliateId || ''}
            onChange={(e) => setTestAffiliateId(e.target.value ? parseInt(e.target.value) : null)}
            className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
          />
        </div>

        {dataLoading && <p className="text-green-600">Carregando dados...</p>}
        {dataError && <p className="text-red-600">Erro: {dataError}</p>}
        
        {affiliateData && (
          <div className="space-y-2">
            <p className="font-medium">{affiliateData.affiliate.full_name}</p>
            <p className="text-gray-600">Indicações diretas: {affiliateData.networkCount}</p>
            <p className="text-gray-600">Ganhos totais: R$ {affiliateData.earnings.total_earnings?.toFixed(2)}</p>
            <p className="text-gray-600">Saldo disponível: R$ {affiliateData.earnings.available_balance?.toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Transactions Test */}
      <div className="mb-8 p-4 bg-purple-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-purple-800">Transações Recentes</h3>
        
        {transactionsLoading && <p className="text-purple-600">Carregando transações...</p>}
        {transactionsError && <p className="text-red-600">Erro: {transactionsError}</p>}
        
        {transactions.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {transactions.slice(0, 5).map((transaction: any, index) => (
              <div key={index} className="p-2 bg-white rounded border">
                <p className="font-medium">{transaction.company_purchases?.companies?.nome_fantasia}</p>
                <p className="text-sm text-gray-600">
                  Valor: R$ {transaction.company_purchases?.purchase_value?.toFixed(2)} | 
                  Comissão: R$ {transaction.commission_amount?.toFixed(2)} | 
                  Nível: {transaction.level}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Nenhuma transação encontrada</p>
        )}
      </div>

      {/* Network Test */}
      <div className="mb-8 p-4 bg-yellow-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-yellow-800">Rede de Indicações</h3>
        
        {networkLoading && <p className="text-yellow-600">Carregando rede...</p>}
        {networkError && <p className="text-red-600">Erro: {networkError}</p>}
        
        {network.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {network.slice(0, 5).map((member: any, index) => (
              <div key={index} className="p-2 bg-white rounded border">
                <p className="font-medium">{member.full_name}</p>
                <p className="text-sm text-gray-600">
                  Nível: {member.level} | CPF: {member.cpf} | 
                  Status: {member.is_active ? 'Ativo' : 'Inativo'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Nenhum membro na rede</p>
        )}
      </div>

      {/* Withdrawals Test */}
      <div className="mb-8 p-4 bg-red-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-red-800">Saques</h3>
        
        {withdrawalsLoading && <p className="text-red-600">Carregando saques...</p>}
        {withdrawalsError && <p className="text-red-600">Erro: {withdrawalsError}</p>}
        
        <button 
          onClick={handleWithdrawal}
          className="mb-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Solicitar Saque
        </button>
        
        {withdrawals.length > 0 ? (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {withdrawals.slice(0, 3).map((withdrawal: any, index) => (
              <div key={index} className="p-2 bg-white rounded border">
                <p className="font-medium">R$ {withdrawal.amount?.toFixed(2)}</p>
                <p className="text-sm text-gray-600">
                  Status: {withdrawal.status} | 
                  Data: {new Date(withdrawal.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Nenhum saque encontrado</p>
        )}
      </div>

      {/* Companies Test */}
      <div className="mb-8 p-4 bg-indigo-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-indigo-800">Empresas Parceiras</h3>
        
        {companiesLoading && <p className="text-indigo-600">Carregando empresas...</p>}
        {companiesError && <p className="text-red-600">Erro: {companiesError}</p>}
        
        {companies.length > 0 ? (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {companies.slice(0, 5).map((company: any, index) => (
              <div key={index} className="p-2 bg-white rounded border">
                <p className="font-medium">{company.nome_fantasia}</p>
                <p className="text-sm text-gray-600">
                  Categoria: {company.company_categories?.name} | 
                  Cashback: {company.cashback_percentage}%
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Nenhuma empresa encontrada</p>
        )}
      </div>

      {/* Dashboard Stats Test */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Estatísticas do Sistema</h3>
        
        {statsLoading && <p className="text-gray-600">Carregando estatísticas...</p>}
        {statsError && <p className="text-red-600">Erro: {statsError}</p>}
        
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded border">
              <p className="text-sm text-gray-600">Total de Afiliados</p>
              <p className="text-xl font-bold text-blue-600">{stats.totalAffiliates}</p>
            </div>
            <div className="p-3 bg-white rounded border">
              <p className="text-sm text-gray-600">Afiliados Ativos</p>
              <p className="text-xl font-bold text-green-600">{stats.activeAffiliates}</p>
            </div>
            <div className="p-3 bg-white rounded border">
              <p className="text-sm text-gray-600">Empresas</p>
              <p className="text-xl font-bold text-purple-600">{stats.totalCompanies}</p>
            </div>
            <div className="p-3 bg-white rounded border">
              <p className="text-sm text-gray-600">Compras do Mês</p>
              <p className="text-xl font-bold text-orange-600">{stats.monthlyPurchases}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}