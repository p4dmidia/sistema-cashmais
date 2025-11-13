import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { 
  Building2, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  DollarSign,
  Percent,
  Users,
  CreditCard,
  LayoutDashboard,
  Shield,
  Settings
} from 'lucide-react';

interface Company {
  id: number;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
  responsavel: string;
  is_active: boolean;
  cashback_percentage: number;
  total_purchases: number;
  total_cashback_generated: number;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function CompaniesManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, [pagination.page, search]);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
      });

      const response = await fetch(`/api/admin/companies?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (companyId: number, _currentStatus: boolean) => {
    setToggleLoading(companyId);
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/toggle-status`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(companies.map(company => 
          company.id === companyId 
            ? { ...company, is_active: data.newStatus }
            : company
        ));
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao alterar status');
      }
    } catch (error) {
      console.error('Failed to toggle company status:', error);
      alert('Erro de conexão');
    } finally {
      setToggleLoading(null);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : 'bg-red-500/20 text-red-400 border-red-500/30';
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
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              <Users className="mr-3 h-5 w-5 text-gray-400" />
              Afiliados
            </Link>
            <Link
              to="/admin/companies"
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20"
            >
              <Building2 className="mr-3 h-5 w-5 text-green-400" />
              Empresas
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
          <h1 className="text-3xl font-bold text-white mb-2">Gestão de Empresas</h1>
          <p className="text-gray-400">Gerencie empresas parceiras e suas configurações</p>
        </div>

        {/* Search and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Buscar por nome, razão social ou CNPJ..."
                className="w-full pl-10 pr-4 py-3 bg-black/20 backdrop-blur-xl border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-black/20 backdrop-blur-xl rounded-lg border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total</p>
                <p className="text-xl font-bold text-white">{pagination.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-xl rounded-lg border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Ativas</p>
                <p className="text-xl font-bold text-green-400">
                  {companies.filter(c => c.is_active).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Companies Table */}
        <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Empresas Parceiras</h2>
            <div className="text-sm text-gray-400">
              {isLoading ? 'Carregando...' : `${companies.length} de ${pagination.total}`}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">
                {search ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-sm font-medium text-gray-400 pb-3">Empresa</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3">CNPJ</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3">Responsável</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3">Cashback</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3">Compras</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3">Total Gerado</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3">Status</th>
                      <th className="text-left text-sm font-medium text-gray-400 pb-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company.id} className="border-b border-white/5 hover:bg-white/2">
                        <td className="py-3">
                          <div>
                            <div className="text-sm text-white font-medium">{company.nome_fantasia}</div>
                            <div className="text-xs text-gray-400">{company.razao_social}</div>
                            <div className="text-xs text-gray-400">{company.email}</div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="text-sm text-gray-300 font-mono">
                            {formatCNPJ(company.cnpj)}
                          </span>
                        </td>
                        <td className="py-3">
                          <div>
                            <div className="text-sm text-white">{company.responsavel}</div>
                            <div className="text-xs text-gray-400">{company.telefone}</div>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center space-x-1">
                            <Percent className="h-4 w-4 text-green-400" />
                            <span className="text-sm text-green-400 font-medium">
                              {company.cashback_percentage || 5}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center space-x-1">
                            <ShoppingCart className="h-4 w-4 text-blue-400" />
                            <span className="text-sm text-white font-medium">{company.total_purchases}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4 text-green-400" />
                            <span className="text-sm text-green-400 font-medium">
                              {formatCurrency(company.total_cashback_generated)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(company.is_active)}`}>
                            {company.is_active ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleToggleStatus(company.id, company.is_active)}
                              disabled={toggleLoading === company.id}
                              className={`${
                                company.is_active
                                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30'
                                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/30'
                              } border px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50`}
                            >
                              {toggleLoading === company.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                              ) : company.is_active ? (
                                <XCircle className="h-3 w-3" />
                              ) : (
                                <CheckCircle className="h-3 w-3" />
                              )}
                            </button>
                            <button className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200">
                              <Eye className="h-3 w-3" />
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
        </div>
      </div>
    </div>
  );
}
