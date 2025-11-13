import { useEffect, useState } from "react";
import Layout from "@/react-app/components/Layout";
import { withAffiliateAuth } from "@/react-app/components/withAuth";
import { useAffiliateAuth } from "@/react-app/hooks/useAuth";
import { Receipt, TrendingUp, TrendingDown, Calendar, Filter } from "lucide-react";

interface Transaction {
  id: number;
  company_name: string;
  purchase_value: number;
  cashback_value: number;
  level_earned: number;
  transaction_date: string;
}

function ExtractPage() {
  const { user: affiliateUser } = useAffiliateAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (affiliateUser) {
      fetchTransactions().finally(() => setLoading(false));
    }
  }, [affiliateUser]);

  

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/transactions', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'level1') return transaction.level_earned === 1;
    if (filter === 'level2plus') return transaction.level_earned > 1;
    return true;
  });

  const totalCashback = transactions.reduce((total, t) => total + t.cashback_value, 0);
  const totalPurchases = transactions.reduce((total, t) => total + t.purchase_value, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-8 h-8 bg-gradient-to-r from-[#70ff00] to-[#50cc00] rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Create compatible user object for layout
  const displayUser = affiliateUser ? {
    id: affiliateUser.id.toString(),
    email: affiliateUser.email,
    google_sub: '',
    profile: {
      id: affiliateUser.id,
      mocha_user_id: affiliateUser.id.toString(),
      cpf: affiliateUser.cpf,
      role: 'affiliate' as const,
      is_active: true,
      sponsor_id: affiliateUser.sponsor_id || null,
      company_name: null,
      created_at: affiliateUser.created_at,
      updated_at: affiliateUser.created_at,
    }
  } : null;

  if (!displayUser) {
    return null;
  }

  return (
    <Layout user={displayUser}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Extrato de Cashback</h1>
          <p className="text-[#70ff00]">Histórico completo das suas transações e ganhos</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-md border border-[#001144]/40 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Total em Cashback</h3>
              <TrendingUp className="w-5 h-5 text-[#70ff00]" />
            </div>
            <p className="text-3xl font-bold text-white">{formatCurrency(totalCashback)}</p>
            <p className="text-sm text-[#70ff00]/80 mt-2">Todos os períodos</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-[#001144]/40 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Volume de Compras</h3>
              <Receipt className="w-5 h-5 text-[#70ff00]" />
            </div>
            <p className="text-3xl font-bold text-white">{formatCurrency(totalPurchases)}</p>
            <p className="text-sm text-[#70ff00]/80 mt-2">Gerou {formatCurrency(totalCashback)}</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-[#001144]/40 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Transações</h3>
              <Calendar className="w-5 h-5 text-[#70ff00]" />
            </div>
            <p className="text-3xl font-bold text-white">{transactions.length}</p>
            <p className="text-sm text-[#70ff00]/80 mt-2">Total de operações</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <Filter className="w-5 h-5 text-gray-400 mr-2" />
              Filtros
            </h2>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Todas as Transações
            </button>
            <button
              onClick={() => setFilter('level1')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'level1'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Nível 1 (Direto)
            </button>
            <button
              onClick={() => setFilter('level2plus')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'level2plus'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Níveis 2+ (Rede)
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">
              Histórico de Transações ({filteredTransactions.length})
            </h2>
          </div>
          
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <Receipt className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                Nenhuma transação encontrada
              </h3>
              <p className="text-gray-500">
                {filter === 'all' 
                  ? 'Você ainda não possui transações registradas.'
                  : 'Nenhuma transação encontrada para este filtro.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="p-6 hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{transaction.company_name}</h3>
                      <p className="text-gray-400 text-sm mt-1">
                        {formatDate(transaction.transaction_date)} • Nível {transaction.level_earned}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="text-gray-400 text-sm">Compra</p>
                          <p className="text-white font-medium">{formatCurrency(transaction.purchase_value)}</p>
                        </div>
                        <TrendingDown className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-green-400 text-sm">Cashback</p>
                          <p className="text-green-400 font-bold">{formatCurrency(transaction.cashback_value)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default withAffiliateAuth(ExtractPage);
