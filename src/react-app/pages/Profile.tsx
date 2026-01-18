import { useEffect, useState } from "react";
import Layout from "@/react-app/components/Layout";
import { withAffiliateAuth } from "@/react-app/components/withAuth";
import { useAffiliateAuth } from "@/react-app/hooks/useAuth";
import { 
  Save, 
  User, 
  Shield, 
  CreditCard, 
  Settings as SettingsIcon,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle
} from "lucide-react";

function Profile() {
  const { user: affiliateUser } = useAffiliateAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showBalance, setShowBalance] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    whatsapp: ''
  });

  const [settingsData, setSettingsData] = useState({
    pix_key: '',
    leg_preference: 'automatic',
    full_name: '',
    phone: ''
  });

  const [balanceData, setBalanceData] = useState({
    available_balance: 0,
    frozen_balance: 0,
    total_earnings: 0,
    company_earnings: 0,
    net_earnings: 0,
    is_active_this_month: false,
    pix_key: ''
  });

  useEffect(() => {
    if (affiliateUser) {
      setFormData({
        full_name: affiliateUser.full_name || '',
        whatsapp: affiliateUser.whatsapp || ''
      });
      setLoading(false);
      
      // Load additional settings and balance
      fetchSettings();
      fetchBalance();
    }
  }, [affiliateUser]);

  const fetchSettings = async () => {
    try {
      const { authenticatedFetch } = await import('@/react-app/lib/authFetch');
      const response = await authenticatedFetch('/api/affiliate/settings');

      if (response.ok) {
        const data = await response.json();
        setSettingsData(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const { authenticatedFetch } = await import('@/react-app/lib/authFetch');
      const response = await authenticatedFetch('/api/users/balance');

      if (response.ok) {
        const data = await response.json();
        setBalanceData(data);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { authenticatedFetch } = await import('@/react-app/lib/authFetch');
      const response = await authenticatedFetch('/api/affiliate/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.full_name ?? '',
          phone: formData.whatsapp ?? '',
          pix_key: settingsData.pix_key ?? '',
          leg_preference: settingsData.leg_preference ?? 'automatic',
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Erro ao atualizar perfil' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { authenticatedFetch } = await import('@/react-app/lib/authFetch');
      const response = await authenticatedFetch('/api/affiliate/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: settingsData.full_name,
          phone: settingsData.phone,
          pix_key: settingsData.pix_key,
          leg_preference: settingsData.leg_preference
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
        await fetchBalance(); // Refresh balance after updating settings
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Erro ao salvar configurações' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const formatPhone = (value: string | undefined | null) => {
    const cleaned = String(value || '').replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, isSettings = false) => {
    const value = e.target.value;
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length <= 11) {
      if (isSettings) {
        setSettingsData(prev => ({
          ...prev,
          phone: formatPhone(cleaned)
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          whatsapp: formatPhone(cleaned)
        }));
      }
    }
  };

  const formatCpf = (cpf: string | undefined | null) => {
    const cleaned = String(cpf || '').replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
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
          <h1 className="text-3xl font-bold text-white mb-2">Meu Perfil & Configurações</h1>
          <p className="text-gray-400">Gerencie suas informações pessoais, configurações e dados financeiros</p>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-900/30 border border-green-700' 
              : 'bg-red-900/30 border border-red-700'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              )}
              <p className={message.type === 'success' ? 'text-green-300' : 'text-red-300'}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Information */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center mb-6">
              <User className="w-5 h-5 text-purple-500 mr-2" />
              <h2 className="text-xl font-semibold text-white">Informações Pessoais</h2>
            </div>
            
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={formData.full_name ?? ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Seu nome completo"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={affiliateUser?.email || ''}
                  disabled
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email não pode ser alterado
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  CPF
                </label>
                <input
                  type="text"
                  value={affiliateUser ? formatCpf(affiliateUser.cpf) : ''}
                  disabled
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  CPF não pode ser alterado
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.whatsapp ?? ''}
                  onChange={(e) => handlePhoneChange(e, false)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <div className="animate-spin w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                {saving ? 'Salvando...' : 'Salvar Perfil'}
              </button>
            </form>
          </div>

          {/* Account Information */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center mb-6">
              <Shield className="w-5 h-5 text-green-500 mr-2" />
              <h2 className="text-xl font-semibold text-white">Informações da Conta</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div>
                  <h3 className="text-white font-medium">Código de Indicação</h3>
                  <p className="text-gray-400 text-sm font-mono">{affiliateUser?.referral_code}</p>
                </div>
                <div className="text-green-400 text-sm font-semibold">Ativo</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div>
                  <h3 className="text-white font-medium">Membro desde</h3>
                  <p className="text-gray-400 text-sm">
                    {affiliateUser ? formatDate(affiliateUser.created_at) : 'Não informado'}
                  </p>
                </div>
                <div className="text-blue-400 text-sm font-semibold">
                  {affiliateUser?.is_verified ? 'Verificado' : 'Pendente'}
                </div>
              </div>

              {affiliateUser?.sponsor_id && (
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <h3 className="text-white font-medium">Patrocinador</h3>
                    <p className="text-gray-400 text-sm">ID: {affiliateUser.sponsor_id}</p>
                  </div>
                  <div className="text-purple-400 text-sm font-semibold">Conectado</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Financial Settings */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <CreditCard className="w-5 h-5 text-green-500 mr-2" />
              <h2 className="text-xl font-semibold text-white">Informações Financeiras</h2>
            </div>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="ml-1 text-sm">{showBalance ? 'Ocultar' : 'Mostrar'}</span>
            </button>
          </div>

          {showBalance && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-r from-green-900/30 to-green-800/30 p-4 rounded-lg border border-green-700">
                <h3 className="text-green-300 text-sm font-medium mb-1">Saldo Disponível</h3>
                <p className="text-white text-lg font-bold">{formatCurrency(balanceData.available_balance)}</p>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/30 p-4 rounded-lg border border-yellow-700">
                <h3 className="text-yellow-300 text-sm font-medium mb-1">Saldo Bloqueado</h3>
                <p className="text-white text-lg font-bold">{formatCurrency(balanceData.frozen_balance)}</p>
              </div>
              
              <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/30 p-4 rounded-lg border border-blue-700">
                <h3 className="text-blue-300 text-sm font-medium mb-1">Total Ganho</h3>
                <p className="text-white text-lg font-bold">{formatCurrency(balanceData.total_earnings)}</p>
              </div>
              
              <div className="bg-gradient-to-r from-purple-900/30 to-purple-800/30 p-4 rounded-lg border border-purple-700">
                <h3 className="text-purple-300 text-sm font-medium mb-1">Líquido Recebido</h3>
                <p className="text-white text-lg font-bold">{formatCurrency(balanceData.net_earnings)}</p>
              </div>
            </div>
          )}

          {!loadingSettings && (
            <form onSubmit={handleSettingsSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Chave PIX
                  </label>
                  <input
                    type="text"
                    value={settingsData.pix_key}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, pix_key: e.target.value }))}
                    placeholder="Digite sua chave PIX"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Necessária para receber saques
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Preferência de Alocação
                  </label>
                  <select
                    value={settingsData.leg_preference}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, leg_preference: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  >
                    <option value="automatic">Automático</option>
                    <option value="left">Perna Esquerda</option>
                    <option value="right">Perna Direita</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Como novos afiliados serão alocados na sua rede
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <div className="animate-spin w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <SettingsIcon className="w-5 h-5 mr-2" />
                )}
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default withAffiliateAuth(Profile);
