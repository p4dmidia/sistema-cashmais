import React, { useState, useEffect } from 'react';
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
  Settings,
} from 'lucide-react';
import AdminLayout from '@/react-app/components/AdminLayout';

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
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_district?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
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
  const [viewData, setViewData] = useState<any | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Company>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

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

  const handleViewCompany = async (companyId: number) => {
    setViewLoading(true);
    try {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setViewData(data);
        setViewOpen(true);
      } else {
        const err = await response.json();
        alert(err.error || 'Erro ao carregar detalhes');
      }
    } catch (error) {
      console.error('Failed to view company:', error);
      alert('Erro de conexão');
    } finally {
      setViewLoading(false);
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditFormData(company);
    setEditOpen(true);
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const response = await fetch(`/api/admin/companies/${editFormData.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
        credentials: 'include',
      });

      if (response.ok) {
        await fetchCompanies();
        setEditOpen(false);
      } else {
        const err = await response.json();
        alert(err.error || 'Erro ao atualizar empresa');
      }
    } catch (error) {
      console.error('Failed to update company:', error);
      alert('Erro de conexão');
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditFormData(prev => ({ ...prev, address_zip: value }));
    
    const cep = value.replace(/\D/g, '');
    if (cep.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setEditFormData(prev => ({
            ...prev,
            address_street: data.logradouro,
            address_district: data.bairro,
            address_city: data.localidade,
            address_state: data.uf
          }));
        }
      } catch (err) {
        console.error('Failed to fetch CEP:', err);
      } finally {
        setCepLoading(false);
      }
    }
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
    <>
      <AdminLayout>
        <div>
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
                          <td className="py-3 text-right pr-4">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleToggleStatus(company.id, company.is_active)}
                                disabled={toggleLoading === company.id}
                                className={`${
                                  company.is_active
                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30'
                                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/30'
                                } border px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50`}
                                title={company.is_active ? 'Inativar' : 'Ativar'}
                              >
                                {toggleLoading === company.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                                ) : company.is_active ? (
                                  <XCircle className="h-3 w-3" />
                                ) : (
                                  <CheckCircle className="h-3 w-3" />
                                )}
                              </button>
                              <button
                                onClick={() => handleViewCompany(company.id)}
                                disabled={viewLoading}
                                className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50"
                                title="Visualizar"
                              >
                                <Eye className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleEditCompany(company)}
                                className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                                title="Editar Endereço/Perfil"
                              >
                                <Settings className="h-3 w-3" />
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
      </AdminLayout>

      {viewOpen && viewData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="w-full max-w-2xl bg-black/80 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Detalhes da Empresa</h3>
              <button
                onClick={() => { setViewOpen(false); setViewData(null); }}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-gray-400">Nome Fantasia</div>
                <div className="text-white text-sm">{viewData.company.nome_fantasia}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-gray-400">Razão Social</div>
                <div className="text-white text-sm">{viewData.company.razao_social}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-gray-400">CNPJ</div>
                <div className="text-white text-sm font-mono">{formatCNPJ(viewData.company.cnpj)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-gray-400">Email</div>
                <div className="text-white text-sm">{viewData.company.email}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-gray-400">Responsável</div>
                <div className="text-white text-sm">{viewData.company.responsavel}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-gray-400">Telefone</div>
                <div className="text-white text-sm">{viewData.company.telefone}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="text-sm text-gray-400">Cashback</div>
                <div className="flex items-center space-x-1 mt-1">
                  <Percent className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">{viewData.metrics.cashback_percentage}%</span>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="text-sm text-gray-400">Compras</div>
                <div className="flex items-center space-x-1 mt-1">
                  <ShoppingCart className="h-4 w-4 text-blue-400" />
                  <span className="text-white text-sm font-medium">{viewData.metrics.total_purchases}</span>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="text-sm text-gray-400">Total Gerado</div>
                <div className="flex items-center space-x-1 mt-1">
                  <DollarSign className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">{formatCurrency(viewData.metrics.total_cashback_generated)}</span>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <div className="text-sm text-gray-400 mb-2">Compras Recentes</div>
              {viewData.recentPurchases.length === 0 ? (
                <div className="text-gray-400 text-sm">Sem compras recentes</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-xs font-medium text-gray-400 pb-2">Data</th>
                        <th className="text-left text-xs font-medium text-gray-400 pb-2">Valor</th>
                        <th className="text-left text-xs font-medium text-gray-400 pb-2">Cashback</th>
                        <th className="text-left text-xs font-medium text-gray-400 pb-2">Cupom</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewData.recentPurchases.map((p: any) => (
                        <tr key={p.id} className="border-b border-white/5">
                          <td className="py-2 text-sm text-white">{new Date(p.purchase_date).toLocaleDateString('pt-BR')}</td>
                          <td className="py-2 text-sm text-white">{formatCurrency(p.purchase_value || 0)}</td>
                          <td className="py-2 text-sm text-green-400">{formatCurrency(p.cashback_generated || 0)}</td>
                          <td className="py-2 text-sm text-gray-300 font-mono">{p.customer_coupon || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#001144]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Editar Empresa</h3>
              <button
                onClick={() => { setEditOpen(false); setEditFormData({}); }}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCompany} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Razão Social</label>
                  <input
                    type="text"
                    required
                    value={editFormData.razao_social || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, razao_social: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    required
                    value={editFormData.nome_fantasia || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, nome_fantasia: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email (CNPJ login)</label>
                  <input
                    type="text"
                    required
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Responsável</label>
                  <input
                    type="text"
                    required
                    value={editFormData.responsavel || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, responsavel: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Telefone</label>
                  <input
                    type="text"
                    required
                    value={editFormData.telefone || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, telefone: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="md:col-span-2 border-t border-white/10 pt-4 mt-2">
                  <h4 className="text-white font-medium mb-4 text-sm uppercase tracking-wider">Endereço (Gatway de Pagamento)</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">CEP</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={9}
                      value={editFormData.address_zip || ''}
                      onChange={handleEditCepChange}
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    {cepLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={editFormData.address_state || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, address_state: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Cidade</label>
                  <input
                    type="text"
                    required
                    value={editFormData.address_city || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, address_city: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Logradouro</label>
                  <input
                    type="text"
                    required
                    value={editFormData.address_street || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, address_street: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Número</label>
                  <input
                    type="text"
                    required
                    value={editFormData.address_number || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, address_number: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Bairro</label>
                  <input
                    type="text"
                    required
                    value={editFormData.address_district || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, address_district: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => { setEditOpen(false); setEditFormData({}); }}
                  className="flex-1 py-2 px-4 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {editLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
