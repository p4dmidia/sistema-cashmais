import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { 
  Settings, 
  Save, 
  DollarSign,
  Users,
  CheckCircle,
  AlertTriangle,
  LayoutDashboard,
  CreditCard,
  Building2,
  Shield,
  LogOut
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';

interface LevelSetting {
  level: number;
  percentage: number;
}

export default function SystemSettings() {
  const [commissionSettings, setCommissionSettings] = useState<LevelSetting[]>([
    { level: 1, percentage: 10.0 },
    { level: 2, percentage: 10.0 },
    { level: 3, percentage: 10.0 },
    { level: 4, percentage: 10.0 },
    { level: 5, percentage: 10.0 },
    { level: 6, percentage: 10.0 },
    { level: 7, percentage: 10.0 },
    { level: 8, percentage: 10.0 },
    { level: 9, percentage: 10.0 },
    { level: 10, percentage: 10.0 },
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');
  const { logout } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadCommissionSettings();
  }, []);

  const loadCommissionSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/commission-settings', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCommissionSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading commission settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const handleLevelPercentageChange = (level: number, value: string) => {
    const percentage = parseFloat(value) || 0;
    setCommissionSettings(prev => 
      prev.map(s => s.level === level ? { ...s, percentage } : s)
    );
  };

  const getTotalPercentage = () => {
    return commissionSettings.reduce((sum, s) => sum + s.percentage, 0);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      // Validate total is 100%
      const total = getTotalPercentage();
      if (Math.abs(total - 100.0) > 0.01) {
        setSaveMessage(`Erro: A soma dos percentuais deve ser 100% (atual: ${total.toFixed(1)}%)`);
        setIsSaving(false);
        setTimeout(() => setSaveMessage(''), 5000);
        return;
      }

      const response = await fetch('/api/admin/commission-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: commissionSettings }),
      });

      if (response.ok) {
        setSaveMessage('Configurações salvas com sucesso!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        const error = await response.json();
        setSaveMessage(error.error || 'Erro ao salvar configurações');
        setTimeout(() => setSaveMessage(''), 5000);
      }
    } catch (error) {
      setSaveMessage('Erro ao salvar configurações');
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
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
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-white/5 hover:text-white"
            >
              <Building2 className="mr-3 h-5 w-5 text-gray-400" />
              Empresas
            </Link>
            <Link
              to="/admin/settings"
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20"
            >
              <Settings className="mr-3 h-5 w-5 text-green-400" />
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
        <div className="p-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Configurações do Sistema</h1>
          <p className="text-gray-400">Configure parâmetros globais do Cashmais</p>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            saveMessage.includes('sucesso') 
              ? 'bg-green-500/20 border border-green-500/30 text-green-400'
              : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}>
            <CheckCircle className="h-5 w-5" />
            <span>{saveMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Commission Distribution Settings */}
            <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-2">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-white">Distribuição de Comissões de Rede</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Configure os percentuais de comissão para cada nível da rede (70% do cashback é distribuído)
                  </p>
                </div>
              </div>

              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h3 className="text-blue-400 font-medium mb-2">Regras de Negócio</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• 30% do cashback fica com a CashMais (taxa administrativa)</li>
                  <li>• 70% do cashback é distribuído na rede conforme percentuais abaixo</li>
                  <li>• Afiliados precisam ter 3+ indicados diretos para ganhar comissões de rede</li>
                  <li>• A soma dos percentuais deve ser exatamente 100%</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                {commissionSettings.map((setting) => (
                  <div key={setting.level}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nível {setting.level}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={setting.percentage}
                        onChange={(e) => handleLevelPercentageChange(setting.level, e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-8"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <span className="text-gray-400 text-xs">%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`p-4 rounded-lg border ${
                Math.abs(getTotalPercentage() - 100.0) < 0.01
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-orange-500/10 border-orange-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${
                    Math.abs(getTotalPercentage() - 100.0) < 0.01
                      ? 'text-green-400'
                      : 'text-orange-400'
                  }`}>
                    Total: {getTotalPercentage().toFixed(1)}%
                  </span>
                  {Math.abs(getTotalPercentage() - 100.0) < 0.01 ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-orange-400" />
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {Math.abs(getTotalPercentage() - 100.0) < 0.01
                    ? 'Percentuais configurados corretamente'
                    : 'A soma dos percentuais deve ser exatamente 100%'}
                </p>
              </div>
            </div>

            {/* Withdrawal Rules Info */}
            <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-2">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white">Regras de Saque</h2>
              </div>

              <div className="space-y-3 text-gray-300">
                <div className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Datas Permitidas</p>
                    <p className="text-sm text-gray-400">Saques só podem ser solicitados nos dias 10 e 15 de cada mês</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Limite Mensal</p>
                    <p className="text-sm text-gray-400">Máximo de 1 saque por mês por afiliado</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Sem Taxa Adicional</p>
                    <p className="text-sm text-gray-400">Os 30% de taxa administrativa já foram descontados nos ganhos</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end mt-8">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white font-medium px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Salvar Configurações</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
