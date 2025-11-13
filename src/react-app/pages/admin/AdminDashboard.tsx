import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { 
  Users, 
  Building2, 
  CreditCard, 
  DollarSign,
  Activity,
  LayoutDashboard,
  Shield,
  Settings,
  LogOut,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';
import WithAdminAuth from './withAdminAuth';

interface Stats {
  totalAffiliates: number;
  totalCompanies: number;
  pendingWithdrawals: {
    count: number;
    totalAmount: number;
  };
  cashbackThisMonth: number;
}

interface Purchase {
  id: number;
  company_name: string;
  customer_cpf: string;
  purchase_value: number;
  cashback_generated: number;
  purchase_date: string;
}

interface ChartData {
  monthlyStats: {
    month: string;
    purchases: number;
    cashback: number;
    companies: number;
    affiliates: number;
  }[];
  statusDistribution: {
    name: string;
    value: number;
    color: string;
  }[];
  weeklyGrowth: {
    day: string;
    newAffiliates: number;
    newCompanies: number;
    totalPurchases: number;
  }[];
}

function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      navigate('/admin/login');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsResponse, chartsResponse] = await Promise.all([
        fetch('/api/admin/dashboard/stats', { credentials: 'include' }),
        fetch('/api/admin/dashboard/charts', { credentials: 'include' })
      ]);

      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setStats(data.stats);
        setPurchases(data.recentPurchases || []);
      }

      if (chartsResponse.ok) {
        const chartData = await chartsResponse.json();
        setChartData(chartData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDateBR = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const statsCards = [
    {
      title: 'Total Afiliados',
      value: stats?.totalAffiliates || 0,
      icon: Users,
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Empresas Ativas',
      value: stats?.totalCompanies || 0,
      icon: Building2,
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Saques Pendentes',
      value: stats?.pendingWithdrawals.count || 0,
      icon: CreditCard,
      gradient: 'from-orange-500 to-red-500',
      subtitle: formatMoney(stats?.pendingWithdrawals.totalAmount || 0)
    },
    {
      title: 'Cashback do Mês',
      value: formatMoney(stats?.cashbackThisMonth || 0),
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-500'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

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
            <div className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20">
              <LayoutDashboard className="mr-3 h-5 w-5 text-green-400" />
              Dashboard
            </div>
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
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              <Building2 className="mr-3 h-5 w-5 text-gray-400" />
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
        <div className="p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-1">
              Painel Administrativo
            </h1>
            <p className="text-slate-400">
              Visão geral do sistema
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsCards.map((card, idx) => (
              <div
                key={idx}
                className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 hover:bg-slate-800/60 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`bg-gradient-to-br ${card.gradient} rounded-lg p-3 shadow-lg`}>
                    <card.icon className="w-6 h-6 text-white" />
                  </div>
                  <Activity className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {typeof card.value === 'number' && card.value < 1000 
                      ? card.value 
                      : card.value}
                  </h3>
                  {card.subtitle && (
                    <p className="text-sm text-slate-400 mb-1">{card.subtitle}</p>
                  )}
                  <p className="text-sm text-slate-500">{card.title}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          {chartData && (
            <div className="space-y-8 mb-8">
              <div className="flex items-center space-x-2 mb-6">
                <BarChart3 className="w-6 h-6 text-green-400" />
                <h2 className="text-xl font-semibold text-white">Visão Geral do Negócio</h2>
              </div>

              {/* Monthly Performance and Status Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Stats Chart */}
                <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 text-green-400 mr-2" />
                    Performance Mensal
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.monthlyStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#9ca3af" 
                          fontSize={12}
                        />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          formatter={(value, name) => [
                            name === 'cashback' ? formatMoney(Number(value)) : value,
                            name === 'purchases' ? 'Compras' : 
                            name === 'cashback' ? 'Cashback' :
                            name === 'companies' ? 'Empresas' : 'Afiliados'
                          ]}
                        />
                        <Legend 
                          wrapperStyle={{ color: '#9ca3af' }}
                          formatter={(value) => 
                            value === 'purchases' ? 'Compras' :
                            value === 'cashback' ? 'Cashback (R$)' :
                            value === 'companies' ? 'Empresas' : 'Afiliados'
                          }
                        />
                        <Bar dataKey="purchases" fill="#3b82f6" name="purchases" />
                        <Bar dataKey="cashback" fill="#10b981" name="cashback" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Status Distribution Pie Chart */}
                <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Activity className="w-5 h-5 text-blue-400 mr-2" />
                    Distribuição Atual
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.statusDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {chartData.statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                        />
                        <Legend wrapperStyle={{ color: '#9ca3af' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Weekly Growth and Cashback Trend */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Growth Chart */}
                <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Users className="w-5 h-5 text-purple-400 mr-2" />
                    Crescimento Semanal
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.weeklyGrowth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="day" 
                          stroke="#9ca3af" 
                          fontSize={12}
                        />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          formatter={(value, name) => [
                            value,
                            name === 'newAffiliates' ? 'Novos Afiliados' :
                            name === 'newCompanies' ? 'Novas Empresas' : 'Total Compras'
                          ]}
                        />
                        <Legend 
                          wrapperStyle={{ color: '#9ca3af' }}
                          formatter={(value) => 
                            value === 'newAffiliates' ? 'Novos Afiliados' :
                            value === 'newCompanies' ? 'Novas Empresas' : 'Total Compras'
                          }
                        />
                        <Line 
                          type="monotone" 
                          dataKey="newAffiliates" 
                          stroke="#8b5cf6" 
                          strokeWidth={3}
                          dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                          name="newAffiliates"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="newCompanies" 
                          stroke="#f59e0b" 
                          strokeWidth={3}
                          dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                          name="newCompanies"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalPurchases" 
                          stroke="#06b6d4" 
                          strokeWidth={3}
                          dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
                          name="totalPurchases"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Cashback Trend Area Chart */}
                <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 text-emerald-400 mr-2" />
                    Evolução do Cashback
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData.monthlyStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#9ca3af" 
                          fontSize={12}
                        />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          formatter={(value) => [formatMoney(Number(value)), 'Cashback Gerado']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="cashback" 
                          stroke="#10b981" 
                          fill="#10b98120" 
                          strokeWidth={3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
            <h2 className="text-xl font-semibold text-white mb-6">
              Compras Recentes
            </h2>

            {purchases.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">Nenhuma compra encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-2 text-sm font-medium text-slate-400">
                        Empresa
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-slate-400">
                        Cliente
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-slate-400">
                        Valor
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-slate-400">
                        Cashback
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-slate-400">
                        Data
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((p) => (
                      <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="py-3 px-2 text-sm text-white">
                          {p.company_name}
                        </td>
                        <td className="py-3 px-2 text-sm text-slate-300">
                          {p.customer_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4')}
                        </td>
                        <td className="py-3 px-2 text-sm text-white font-medium">
                          {formatMoney(p.purchase_value)}
                        </td>
                        <td className="py-3 px-2 text-sm text-emerald-400 font-medium">
                          {formatMoney(p.cashback_generated)}
                        </td>
                        <td className="py-3 px-2 text-sm text-slate-300">
                          {formatDateBR(p.purchase_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProtectedAdminDashboard() {
  return (
    <WithAdminAuth>
      <AdminDashboard />
    </WithAdminAuth>
  );
}
