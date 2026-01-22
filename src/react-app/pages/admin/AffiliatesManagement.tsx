import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { 
  Users, 
  Search, 
  Eye, 
  UserCheck, 
  UserX,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Edit,
  Trash2,
  X,
  AlertTriangle,
  Wallet,
  UserPlus,
  Activity,
  LayoutDashboard,
  CreditCard,
  Building2,
  Shield,
  Settings,
  LogOut
} from 'lucide-react';
import { Printer } from 'lucide-react';

interface Affiliate {
  id: number;
  full_name: string;
  email: string;
  cpf: string;
  whatsapp: string | null;
  is_active: boolean;
  is_verified: boolean;
  referral_code: string;
  sponsor_id: number | null;
  direct_referrals: number;
  total_cashback: number;
  pending_commissions: number;
  created_at: string;
  last_access_at: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface GlobalStats {
  totalActive: number;
  totalInactive: number;
  totalCashbackGenerated: number;
  totalCommissionsPending: number;
  newAffiliatesThisMonth: number;
}

interface EditFormData {
  full_name: string;
  email: string;
  whatsapp: string;
}

export default function AffiliatesManagement() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { authenticatedFetch } = await import('@/react-app/lib/authFetch');
      await authenticatedFetch('/api/admin/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      try { localStorage.removeItem('admin_token'); } catch {}
      navigate('/admin/login');
    }
  };
  
  // Modal states
  const [editModal, setEditModal] = useState<{ open: boolean; affiliate: Affiliate | null }>({ open: false, affiliate: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; affiliate: Affiliate | null }>({ open: false, affiliate: null });
  const [viewModal, setViewModal] = useState<{ open: boolean; affiliate: Affiliate | null }>({ open: false, affiliate: null });
  
  const [editFormData, setEditFormData] = useState<EditFormData>({ full_name: '', email: '', whatsapp: '' });
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    loadAffiliatesData();
  }, [pagination.page, search]);

  useEffect(() => {
    // Reload data every 30 seconds like dashboard
    const interval = setInterval(() => {
      loadAffiliatesData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [pagination.page, search]);

  const loadAffiliatesData = async () => {
    setIsLoading(true);
    try {
      const { authenticatedFetch } = await import('@/react-app/lib/authFetch');
      const [statsResponse, affiliatesResponse] = await Promise.all([
        authenticatedFetch('/api/admin/affiliates/stats'),
        authenticatedFetch(`/api/admin/affiliates?${new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
          ...(search && { search }),
        })}`)
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setGlobalStats(statsData);
      } else {
        setGlobalStats({
          totalActive: 0,
          totalInactive: 0,
          totalCashbackGenerated: 0,
          totalCommissionsPending: 0,
          newAffiliatesThisMonth: 0
        });
      }

      if (affiliatesResponse.ok) {
        const affiliatesData = await affiliatesResponse.json();
        setAffiliates(affiliatesData.affiliates || []);
        setPagination(affiliatesData.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      } else {
        setAffiliates([]);
        setPagination({ page: 1, limit: 20, total: 0, totalPages: 0 });
      }

    } catch (error) {
      console.error('Error loading affiliates data:', error);
      setGlobalStats({
        totalActive: 0,
        totalInactive: 0,
        totalCashbackGenerated: 0,
        totalCommissionsPending: 0,
        newAffiliatesThisMonth: 0
      });
      setAffiliates([]);
      setPagination({ page: 1, limit: 20, total: 0, totalPages: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  

  const handleToggleStatus = async (affiliateId: number) => {
    setActionLoading(affiliateId);
    try {
      const { authenticatedFetch } = await import('@/react-app/lib/authFetch');
      const response = await authenticatedFetch(`/api/admin/affiliates/${affiliateId}/toggle-status`, {
        method: 'PATCH',
      });

      if (response.ok) {
        const data = await response.json();
        setAffiliates(affiliates.map(affiliate => 
          affiliate.id === affiliateId 
            ? { ...affiliate, is_active: data.newStatus }
            : affiliate
        ));
        // Refresh stats after status change
        loadAffiliatesData();
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao alterar status');
      }
    } catch (error) {
      console.error('Failed to toggle affiliate status:', error);
      alert('Erro de conexão');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (affiliate: Affiliate) => {
    setEditFormData({
      full_name: affiliate.full_name,
      email: affiliate.email,
      whatsapp: affiliate.whatsapp || '',
    });
    setEditModal({ open: true, affiliate });
  };

  const handleSaveEdit = async () => {
    if (!editModal.affiliate) return;

    setEditLoading(true);
    try {
      const { authenticatedFetch } = await import('@/react-app/lib/authFetch');
      const response = await authenticatedFetch(`/api/admin/affiliates/${editModal.affiliate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      if (response.ok) {
        setAffiliates(affiliates.map(aff => 
          aff.id === editModal.affiliate!.id 
            ? { ...aff, ...editFormData }
            : aff
        ));
        setEditModal({ open: false, affiliate: null });
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao atualizar afiliado');
      }
    } catch (error) {
      console.error('Failed to update affiliate:', error);
      alert('Erro de conexão');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.affiliate) return;

    setActionLoading(deleteModal.affiliate.id);
    try {
      const { authenticatedFetch } = await import('@/react-app/lib/authFetch');
      const response = await authenticatedFetch(`/api/admin/affiliates/${deleteModal.affiliate.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAffiliates(affiliates.filter(aff => aff.id !== deleteModal.affiliate!.id));
        setDeleteModal({ open: false, affiliate: null });
        // Refresh stats after deletion
        loadAffiliatesData();
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao excluir afiliado');
      }
    } catch (error) {
      console.error('Failed to delete affiliate:', error);
      alert('Erro de conexão');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
    // Debounce search to avoid too many API calls
    setTimeout(() => {
      loadAffiliatesData();
    }, 300);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const getLastAccessColor = (lastAccess: string | null) => {
    if (!lastAccess) return 'text-gray-500';
    
    const lastAccessDate = new Date(lastAccess);
    const daysSinceAccess = Math.floor((Date.now() - lastAccessDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceAccess <= 7) return 'text-green-400';
    if (daysSinceAccess <= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011]">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-black/20 backdrop-blur-xl border-r border-white/10">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-green-400" />
              <span className="text-xl font-bold text-white">Admin</span>
            </div>
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
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              <CreditCard className="mr-3 h-5 w-5 text-gray-400" />
              Saques
            </Link>
            <Link
              to="/admin/affiliates"
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20"
            >
              <Users className="mr-3 h-5 w-5 text-green-400" />
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

          {/* Logout Button */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="mr-3 h-5 w-5 text-red-400" />
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Gestão de Afiliados</h1>
            <p className="text-gray-400">Gerencie afiliados, visualize estatísticas e realize ações administrativas</p>
          </div>

          {/* Global Statistics */}
          {globalStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-xl rounded-xl border border-blue-500/30 p-6">
              <div className="flex items-center justify-between mb-3">
                <Users className="h-8 w-8 text-blue-400" />
                <Activity className="h-5 w-5 text-blue-400/50" />
              </div>
              <p className="text-sm text-gray-400 mb-1">Afiliados Ativos</p>
              <p className="text-3xl font-bold text-white">{globalStats.totalActive}</p>
            </div>

            <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-xl rounded-xl border border-red-500/30 p-6">
              <div className="flex items-center justify-between mb-3">
                <UserX className="h-8 w-8 text-red-400" />
                <AlertTriangle className="h-5 w-5 text-red-400/50" />
              </div>
              <p className="text-sm text-gray-400 mb-1">Inativos</p>
              <p className="text-3xl font-bold text-white">{globalStats.totalInactive}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-xl rounded-xl border border-green-500/30 p-6">
              <div className="flex items-center justify-between mb-3">
                <DollarSign className="h-8 w-8 text-green-400" />
                <TrendingUp className="h-5 w-5 text-green-400/50" />
              </div>
              <p className="text-sm text-gray-400 mb-1">Cashback Gerado</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(globalStats.totalCashbackGenerated)}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-xl rounded-xl border border-purple-500/30 p-6">
              <div className="flex items-center justify-between mb-3">
                <Wallet className="h-8 w-8 text-purple-400" />
                <DollarSign className="h-5 w-5 text-purple-400/50" />
              </div>
              <p className="text-sm text-gray-400 mb-1">Comissões Pendentes</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(globalStats.totalCommissionsPending)}</p>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 backdrop-blur-xl rounded-xl border border-cyan-500/30 p-6">
              <div className="flex items-center justify-between mb-3">
                <UserPlus className="h-8 w-8 text-cyan-400" />
                <Users className="h-5 w-5 text-cyan-400/50" />
              </div>
              <p className="text-sm text-gray-400 mb-1">Novos no Mês</p>
              <p className="text-3xl font-bold text-white">{globalStats.newAffiliatesThisMonth}</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Buscar por nome, email ou CPF..."
              className="w-full pl-12 pr-4 py-3 bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Affiliates Table */}
        <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Lista de Afiliados</h2>
            <div className="text-sm text-gray-400 flex items-center space-x-2">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b border-green-400"></div>
                  <span>Carregando...</span>
                </>
              ) : (
                <span>{affiliates.length} de {pagination.total}</span>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
              <p className="text-gray-400">Carregando dados dos afiliados...</p>
            </div>
          ) : affiliates.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">
                {search ? 'Nenhum afiliado encontrado' : 'Nenhum afiliado cadastrado'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-sm font-medium text-gray-400 pb-3 px-2">Afiliado</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3 px-2">Código</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3 px-2">Indicações</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3 px-2">Cashback</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3 px-2">Comissões</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3 px-2">Status</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3 px-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {affiliates.map((affiliate) => (
                      <tr key={affiliate.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-2">
                          <div>
                            <div className="text-sm text-white font-medium">{affiliate.full_name}</div>
                            <div className="text-xs text-gray-400">{affiliate.email}</div>
                            <div className="text-xs text-gray-400">
                              CPF: {affiliate.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4')}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-mono">
                            {affiliate.referral_code}
                          </span>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4 text-green-400" />
                            <span className="text-sm text-white font-medium">{affiliate.direct_referrals}</span>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <span className="text-sm text-green-400 font-medium">
                            {formatCurrency(affiliate.total_cashback)}
                          </span>
                        </td>
                        <td className="py-4 px-2">
                          <span className="text-sm text-purple-400 font-medium">
                            {formatCurrency(affiliate.pending_commissions || 0)}
                          </span>
                        </td>
                        <td className="py-4 px-2">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(affiliate.is_active)}`}>
                            {affiliate.is_active ? 'Ativo' : 'Bloqueado'}
                          </span>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setViewModal({ open: true, affiliate })}
                              className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 p-2 rounded-lg transition-all duration-200"
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(affiliate)}
                              className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30 p-2 rounded-lg transition-all duration-200"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(affiliate.id)}
                              disabled={actionLoading === affiliate.id}
                              className={`${
                                affiliate.is_active
                                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30'
                                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/30'
                              } border p-2 rounded-lg transition-all duration-200 disabled:opacity-50`}
                              title={affiliate.is_active ? 'Bloquear' : 'Desbloquear'}
                            >
                              {actionLoading === affiliate.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b border-current"></div>
                              ) : affiliate.is_active ? (
                                <UserX className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => setDeleteModal({ open: true, affiliate })}
                              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 p-2 rounded-lg transition-all duration-200"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
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

        {/* View Modal */}
        {viewModal.open && viewModal.affiliate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Detalhes do Afiliado</h3>
                <button
                  onClick={() => setViewModal({ open: false, affiliate: null })}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Nome Completo</p>
                    <p className="text-white font-medium">{viewModal.affiliate.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="text-white font-medium">{viewModal.affiliate.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">CPF</p>
                    <p className="text-white font-medium">{viewModal.affiliate.cpf}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">WhatsApp</p>
                    <p className="text-white font-medium">{viewModal.affiliate.whatsapp || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Código de Indicação</p>
                    <p className="text-blue-400 font-mono font-medium">{viewModal.affiliate.referral_code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Status</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(viewModal.affiliate.is_active)}`}>
                      {viewModal.affiliate.is_active ? 'Ativo' : 'Bloqueado'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Indicações Diretas</p>
                    <p className="text-white font-medium">{viewModal.affiliate.direct_referrals}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Cashback Total Gerado</p>
                    <p className="text-green-400 font-medium">{formatCurrency(viewModal.affiliate.total_cashback)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Comissões Pendentes</p>
                    <p className="text-purple-400 font-medium">{formatCurrency(viewModal.affiliate.pending_commissions || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Data de Cadastro</p>
                    <p className="text-white font-medium">{formatDateTime(viewModal.affiliate.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Último Acesso</p>
                    <p className={`font-medium ${getLastAccessColor(viewModal.affiliate.last_access_at)}`}>
                      {viewModal.affiliate.last_access_at ? formatDateTime(viewModal.affiliate.last_access_at) : 'Nunca'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Verificado</p>
                    <p className="text-white font-medium">{viewModal.affiliate.is_verified ? 'Sim' : 'Não'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editModal.open && editModal.affiliate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Editar Afiliado</h3>
                <button
                  onClick={() => setEditModal({ open: false, affiliate: null })}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Nome Completo</label>
                  <input
                    type="text"
                    value={editFormData.full_name}
                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                    className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">WhatsApp</label>
                  <input
                    type="text"
                    value={editFormData.whatsapp}
                    onChange={(e) => setEditFormData({ ...editFormData, whatsapp: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setEditModal({ open: false, affiliate: null })}
                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={editLoading}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {editLoading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deleteModal.open && deleteModal.affiliate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-red-500/30 rounded-2xl p-8 max-w-md w-full mx-4">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-red-500/20 p-4 rounded-full">
                  <AlertTriangle className="h-12 w-12 text-red-400" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-white text-center mb-4">Confirmar Exclusão</h3>
              <p className="text-gray-400 text-center mb-6">
                Tem certeza que deseja excluir o afiliado <strong className="text-white">{deleteModal.affiliate.full_name}</strong>?
                Esta ação não pode ser desfeita.
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setDeleteModal({ open: false, affiliate: null })}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading === deleteModal.affiliate.id}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {actionLoading === deleteModal.affiliate.id ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
