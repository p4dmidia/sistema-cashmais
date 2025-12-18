import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { 
  CreditCard, 
  Check, 
  X, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  Building2,
  LayoutDashboard,
  Shield,
  Settings
} from 'lucide-react';
import { Printer } from 'lucide-react';

interface Withdrawal {
  id: number;
  amount_requested: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  pix_key: string;
  created_at: string;
  full_name: string;
  cpf: string;
  email: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function WithdrawalsManagement() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [status, setStatus] = useState('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchWithdrawals();
  }, [status, pagination.page]);

  const fetchWithdrawals = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/withdrawals?status=${status}&page=${pagination.page}&limit=${pagination.limit}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (withdrawalId: number, newStatus: 'approved' | 'rejected') => {
    setProcessingId(withdrawalId);
    try {
      const response = await fetch(`/api/admin/withdrawals/${withdrawalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchWithdrawals(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao processar saque');
      }
    } catch (error) {
      console.error('Failed to update withdrawal:', error);
      alert('Erro de conexão');
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'approved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011]">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-black/20 backdrop-blur-xl border-r border-white/10">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-white/10">
            <img
              src="https://mocha-cdn.com/01995053-6d08-799d-99f1-d9898351a40a/Design-sem-nome.png"
              alt="CashMais"
              className="h-20 w-auto"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            <Link
              to="/admin/dashboard"
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              <LayoutDashboard className="mr-3 h-5 w-5 text-gray-400" />
              Dashboard
            </Link>
            <Link
              to="/admin/withdrawals"
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20"
            >
              <CreditCard className="mr-3 h-5 w-5 text-green-400" />
              Saques
            </Link>
            <Link
              to="/admin/affiliates"
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              <Users className="mr-3 h-5 w-5 text-gray-400" />
              Afiliados
            </Link>
            <Link
              to="/admin/companies"
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              <Building2 className="mr-3 h-5 w-5 text-gray-400" />
              Empresas
            </Link>
            <Link
              to="/admin/reports"
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              <Printer className="mr-3 h-5 w-5 text-gray-400" />
              Relatórios
            </Link>
            <Link
              to="/admin/settings"
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              <Settings className="mr-3 h-5 w-5 text-gray-400" />
              Configurações
            </Link>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <div className="p-8">
          {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Gestão de Saques</h1>
          <p className="text-gray-400">Gerencie solicitações de saque dos afiliados</p>
        </div>

        {/* Filters */}
        <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6 mb-8">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <div className="flex space-x-2">
              {['pending', 'approved', 'rejected'].map((statusOption) => (
                <button
                  key={statusOption}
                  onClick={() => {
                    setStatus(statusOption);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    status === statusOption
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {getStatusLabel(statusOption)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Withdrawals Table */}
        <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              Saques {getStatusLabel(status)}
            </h2>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>Total: {pagination.total}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Nenhum saque {getStatusLabel(status).toLowerCase()} encontrado</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-sm font-medium text-gray-400 pb-3">Afiliado</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3">Valor</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3">Taxa</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3">Líquido</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3">Chave PIX</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3">Data</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3">Status</th>
                      {status === 'pending' && (
                        <th className="text-left text-sm font-medium text-gray-400 pb-3">Ações</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((withdrawal) => (
                      <tr key={withdrawal.id} className="border-b border-white/5">
                        <td className="py-3">
                          <div>
                            <div className="text-sm text-white font-medium">{withdrawal.full_name}</div>
                            <div className="text-xs text-gray-400">{withdrawal.email}</div>
                            <div className="text-xs text-gray-400">
                              {withdrawal.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4')}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-sm text-white font-medium">
                          {formatCurrency(withdrawal.amount_requested)}
                        </td>
                        <td className="py-3 text-sm text-red-400">
                          -{formatCurrency(withdrawal.fee_amount)}
                        </td>
                        <td className="py-3 text-sm text-green-400 font-medium">
                          {formatCurrency(withdrawal.net_amount)}
                        </td>
                        <td className="py-3 text-sm text-gray-300">
                          {withdrawal.pix_key}
                        </td>
                        <td className="py-3 text-sm text-gray-300">
                          {formatDate(withdrawal.created_at)}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(withdrawal.status)}`}>
                            {getStatusLabel(withdrawal.status)}
                          </span>
                        </td>
                        {status === 'pending' && (
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleStatusUpdate(withdrawal.id, 'approved')}
                                disabled={processingId === withdrawal.id}
                                className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50"
                              >
                                {processingId === withdrawal.id ? (
                                  <Clock className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(withdrawal.id, 'rejected')}
                                disabled={processingId === withdrawal.id}
                                className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
                  <div className="text-sm text-gray-400">
                    Página {pagination.page} de {pagination.totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.totalPages}
                      className="bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
