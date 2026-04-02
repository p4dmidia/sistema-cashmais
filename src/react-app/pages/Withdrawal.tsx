import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Layout from "@/react-app/components/Layout";
import { withAffiliateAuth } from "@/react-app/components/withAuth";
import { useAffiliateAuth } from "@/react-app/hooks/useAuth";
import { DollarSign, Clock, CheckCircle, XCircle, CreditCard } from "lucide-react";

interface UserBalance {
  available_balance: number;
  frozen_balance: number;
  total_earnings: number;
  company_earnings: number;
  net_earnings: number;
  is_active_this_month: boolean;
  pix_key?: string;
}

interface Withdrawal {
  id: number;
  amount_requested: number;
  fee_amount: number;
  net_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  pix_key: string;
  processed_at?: string;
  created_at: string;
}



function WithdrawalPage() {
  const navigate = useNavigate();
  const { user: affiliateUser } = useAffiliateAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (affiliateUser) {
      Promise.all([
        fetchBalance(),
        fetchWithdrawals()
      ]).finally(() => setLoading(false));
    }
  }, [affiliateUser]);

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/users/balance', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setBalance(data);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const response = await fetch('/api/withdrawals', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const withdrawalAmount = parseFloat(amount);

    if (!withdrawalAmount || withdrawalAmount <= 0) {
      setError('Digite um valor válido');
      return;
    }

    if (!balance) {
      setError('Erro ao carregar saldo');
      return;
    }

    if (withdrawalAmount > balance.available_balance) {
      setError('Saldo insuficiente');
      return;
    }

    if (!balance.pix_key) {
      setError('Configure sua chave PIX nas configurações primeiro');
      return;
    }

    if (!balance.is_active_this_month) {
      setError('Você precisa ter feito pelo menos uma compra no mês anterior para solicitar saques');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          amount: withdrawalAmount,
          p_current_day: new Date().getDate() // Enviamos o dia da máquina para permitir o teste do usuário
        }),
      });

      if (response.ok) {
        setSuccess('Solicitação de saque enviada com sucesso!');
        setAmount('');
        await Promise.all([fetchBalance(), fetchWithdrawals()]);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao solicitar saque');
      }
    } catch (error) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400';
      case 'approved':
        return 'text-green-400';
      case 'rejected':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  

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
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Solicitar Saque</h1>
          <p className="text-gray-400">Retire seus ganhos de cashback via PIX</p>
        </div>

        {/* Balance Cards */}
        {balance && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-300 font-medium">Disponível p/ Saque</h3>
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-white">{formatCurrency(balance.available_balance)}</p>
              <p className="text-sm text-gray-500 mt-2">Valor líquido (70%)</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-300 font-medium">Saldo Bloqueado</h3>
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-3xl font-bold text-white">{formatCurrency(balance.frozen_balance)}</p>
              <p className="text-sm text-gray-500 mt-2">Processamento pendente</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-300 font-medium">Seus Ganhos</h3>
                <CreditCard className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-white">{formatCurrency(balance.net_earnings)}</p>
              <p className="text-sm text-gray-500 mt-2">Total líquido (70%)</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-300 font-medium">Cashback Gerado</h3>
                <CreditCard className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-white">{formatCurrency(balance.total_earnings)}</p>
              <p className="text-sm text-gray-500 mt-2">Total bruto</p>
            </div>
          </div>
        )}

        {/* Withdrawal Form */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-6">Nova Solicitação de Saque</h2>
          
          {/* Prerequisites Check */}
          {balance && (
            <div className="mb-6 space-y-3">
              <div className="flex items-center space-x-3">
                {balance.pix_key ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className={balance.pix_key ? 'text-green-400' : 'text-red-400'}>
                  Chave PIX configurada
                </span>
                {!balance.pix_key && (
                  <button
                    onClick={() => navigate('/perfil')}
                    className="text-purple-400 hover:text-purple-300 text-sm underline"
                  >
                    Configurar agora
                  </button>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                {balance.is_active_this_month ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className={balance.is_active_this_month ? 'text-green-400' : 'text-red-400'}>
                  Ativo no mês anterior (pelo menos 1 compra)
                </span>
              </div>

              <div className="flex items-center space-x-3">
                {balance.available_balance > 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className={balance.available_balance > 0 ? 'text-green-400' : 'text-red-400'}>
                  Saldo disponível
                </span>
              </div>

          {/* Withdrawal Date Restriction - Temporarily disabled for testing */}
              {/* Withdrawal Date Restriction Status */}
              <div className="flex items-center space-x-3">
                {[10, 15].includes(new Date().getDate()) ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Clock className="w-5 h-5 text-yellow-500" />
                )}
                <span className={[10, 15].includes(new Date().getDate()) ? 'text-green-400' : 'text-yellow-400'}>
                  {[10, 15].includes(new Date().getDate()) 
                    ? 'Hoje é dia de saque!' 
                    : 'Aguardando dia 10 ou 15 para saque'}
                </span>
              </div>
            </div>
          )}

          {/* Balance Information */}
          <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-blue-400 mr-2 mt-0.5" />
              <div>
                <h4 className="text-blue-300 font-medium mb-2">Regras de Saque</h4>
                <p className="text-blue-200 text-sm">
                  • Saques permitidos apenas nos dias 10 e 15 de cada mês<br/>
                  • Máximo de 1 saque por mês<br/>
                  • Processamento: até 2 dias úteis via PIX<br/>
                  • Sem taxas adicionais no momento do saque
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-900/30 border border-green-700 rounded-lg">
              <p className="text-green-300 text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Valor do Saque (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={balance?.available_balance || 0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-lg"
                placeholder="0,00"
                disabled={!balance?.pix_key || !balance?.is_active_this_month || submitting}
              />
              {amount && parseFloat(amount) > 0 && (
                <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-300">Você receberá:</span>
                    <span className="text-green-400">{formatCurrency(parseFloat(amount))}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Valor líquido • Sem taxas adicionais
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !balance?.pix_key || !balance?.is_active_this_month || !amount || parseFloat(amount) <= 0 || ![10, 15].includes(new Date().getDate())}
              className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="animate-spin w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <DollarSign className="w-5 h-5 mr-2" />
              )}
              {submitting ? 'Processando...' : 'Solicitar Saque'}
            </button>
          </form>
        </div>

        {/* Withdrawal History */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Histórico de Saques</h2>
          </div>
          
          {withdrawals.length === 0 ? (
            <div className="p-8 text-center">
              <DollarSign className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                Nenhum saque realizado
              </h3>
              <p className="text-gray-500">
                Suas solicitações de saque aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="p-5 sm:p-6 hover:bg-gray-700/10 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 space-y-3 sm:space-y-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(withdrawal.status)}
                          <span className={`font-bold text-sm uppercase tracking-wider ${getStatusColor(withdrawal.status)}`}>
                            {getStatusText(withdrawal.status)}
                          </span>
                        </div>
                        <span className="text-gray-500 text-xs sm:text-sm">
                          Solicitado em {formatDate(withdrawal.created_at)}
                        </span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center text-gray-400 text-sm gap-2 sm:gap-4">
                        <div className="flex items-center">
                          <span className="text-gray-600 mr-2 text-xs uppercase font-bold">PIX:</span>
                          <span className="font-mono text-gray-300">{withdrawal.pix_key}</span>
                        </div>
                        {withdrawal.processed_at && (
                          <div className="flex items-center">
                             <span className="w-1 h-1 bg-gray-600 rounded-full mx-2 hidden sm:block"></span>
                             <span className="text-gray-600 mr-2 text-xs uppercase font-bold">Processado:</span>
                             <span className="text-gray-300">{formatDate(withdrawal.processed_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                      <div className="sm:text-right">
                        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Valor Solicitado</p>
                        <p className="text-white font-bold text-xl">{formatCurrency(withdrawal.amount_requested)}</p>
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

export default withAffiliateAuth(WithdrawalPage);
