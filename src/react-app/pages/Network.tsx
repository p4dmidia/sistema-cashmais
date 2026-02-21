import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Layout from "@/react-app/components/Layout";
import { useAffiliateAuth } from "@/react-app/hooks/useAuth";
import { Users, Target, Activity, Settings2, Eye, EyeOff, TreePine } from "lucide-react";
import PreferenceToggle from "@/react-app/components/PreferenceToggle";
import TernaryNetworkTree from "@/react-app/components/TernaryNetworkTree";

interface NetworkMember {
  id: number;
  email: string;
  cpf: string;
  level: number;
  is_active_this_month: boolean;
  last_purchase_date: string;
  total_purchases: number;
  created_at: string;
}

interface NetworkStats {
  level1: number;
  level2: number;
  level3: number;
  level4: number;
  level5: number;
  level6: number;
  level7: number;
  level8: number;
  level9: number;
  level10: number;
  total_active: number;
  total_inactive: number;
}

type PreferenceType = 'left' | 'right' | 'center' | 'auto';

function NetworkPage() {
  console.log('[NETWORK] Component mounted');
  const navigate = useNavigate();
  const { user: affiliateUser, loading: authLoading } = useAffiliateAuth();

  console.log('[NETWORK] Auth state:', {
    authLoading,
    hasUser: !!affiliateUser,
    userEmail: affiliateUser?.email
  });
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<NetworkMember[]>([]);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [preference, setPreference] = useState<PreferenceType>('auto');
  const [updatingPreference, setUpdatingPreference] = useState(false);
  const [showInactive, setShowInactive] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree');

  useEffect(() => {
    console.log('[NETWORK] useEffect triggered:', { authLoading, hasUser: !!affiliateUser });

    if (!authLoading) {
      if (affiliateUser) {
        console.log('[NETWORK] User authenticated, loading data...');
        Promise.all([
          fetchNetworkMembers(),
          fetchNetworkStats(),
          fetchNetworkPreference()
        ]).finally(() => {
          console.log('[NETWORK] Data loading completed');
          setLoading(false);
        });
      } else {
        console.log('[NETWORK] No affiliate user found, redirecting to login');
        navigate('/login');
      }
    }
  }, [affiliateUser, authLoading, navigate]);

  const fetchNetworkMembers = async () => {
    try {
      const { authenticatedFetch } = await import('@/react-app/lib/authFetch');
      const response = await authenticatedFetch('/api/network/members');
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Error fetching network members:', error);
    }
  };

  const fetchNetworkStats = async () => {
    try {
      const { authenticatedFetch } = await import('@/react-app/lib/authFetch');
      const response = await authenticatedFetch('/api/network/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching network stats:', error);
    }
  };

  const fetchNetworkPreference = async () => {
    try {
      const { authenticatedFetch } = await import('@/react-app/lib/authFetch');
      // Adicionando timestamp para evitar cache e garantir o estado mais recente do DB
      const response = await authenticatedFetch(`/api/affiliate/network/preference?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('[NETWORK] API Preference Data:', data);

        if (data.preference) {
          console.log('[NETWORK] Setting preference state to:', data.preference);
          setPreference(data.preference);
        } else {
          console.warn('[NETWORK] Preference missing in response:', data);
        }

        try {
          const prevUrl = `/api/affiliate/network/placement-preview?t=${Date.now()}`;
          const prev = await authenticatedFetch(prevUrl);
          if (prev.ok) {
            const pv = await prev.json();
            console.log('[NETWORK] Placement preview data:', pv);
          }
        } catch (e) {
          console.error('[NETWORK] Error fetching placement preview:', e);
        }
      } else {
        console.error('[NETWORK] Preference API returned error status:', response.status);
      }
    } catch (error) {
      console.error('[NETWORK] Error in fetchNetworkPreference:', error);
    }
  };

  const handlePreferenceChange = async (newPreference: PreferenceType) => {
    console.log('[NETWORK] Updating preference to:', newPreference)
    setUpdatingPreference(true);
    // Optimistic update
    const previousPreference = preference;
    setPreference(newPreference);

    try {
      const { authenticatedFetch } = await import('@/react-app/lib/authFetch');
      const response = await authenticatedFetch('/api/affiliate/network/preference', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preference: newPreference }),
      });

      if (response.ok) {
        console.log('[NETWORK] Preference update OK')
        // Refresh to be sure we are in sync with server logic
        await fetchNetworkPreference()
      } else {
        const err = await response.text()
        console.log('[NETWORK] Preference update failed:', err)
        // Revert on error
        setPreference(previousPreference);
        alert("Erro ao salvar preferência. Tente novamente.");
      }
    } catch (error) {
      console.error('Error updating preference:', error);
      // Revert on error
      setPreference(previousPreference);
    } finally {
      setUpdatingPreference(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const filteredMembers = showInactive
    ? members
    : members.filter(member => member.is_active_this_month);

  if (authLoading || loading) {
    console.log('[NETWORK] Rendering loading state:', { authLoading, loading });
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-8 h-8 bg-gradient-to-r from-[#70ff00] to-[#50cc00] rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Don't render anything if we're redirecting
  if (!authLoading && !affiliateUser) {
    console.log('[NETWORK] Rendering null - will redirect to login');
    return null; // Will redirect via useEffect
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
    console.log('[NETWORK] No display user, returning null');
    return null;
  }

  console.log('[NETWORK] Rendering network page for user:', displayUser.email);
  return (
    <Layout user={displayUser}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Minha Rede MLM</h1>
          <p className="text-gray-400">Gerencie sua rede de afiliados e acompanhe o crescimento</p>
        </div>

        {/* Network Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(level => (
              <div key={level} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div className="text-center">
                  <p className="text-gray-400 text-sm">Nível {level}</p>
                  <p className="text-2xl font-bold text-white">{stats[`level${level}` as keyof NetworkStats] as number}</p>
                </div>
              </div>
            ))}

            <div className="md:col-span-5 grid grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-300 font-medium">Afiliados Ativos</h3>
                  <Activity className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-white">{stats.total_active}</p>
                <p className="text-sm text-gray-500 mt-2">Compraram no mês anterior</p>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-300 font-medium">Total da Rede</h3>
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-3xl font-bold text-white">{stats.total_active + stats.total_inactive}</p>
                <p className="text-sm text-gray-500 mt-2">{stats.total_inactive} inativos</p>
              </div>
            </div>
          </div>
        )}

        {/* Network Preferences */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <Settings2 className="w-5 h-5 text-gray-400 mr-2" />
              Configurações de Rede
            </h2>
          </div>

          <PreferenceToggle
            value={preference}
            onChange={handlePreferenceChange}
            disabled={updatingPreference}
          />
        </div>

        {/* Network Tree View */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <TreePine className="w-5 h-5 text-purple-500 mr-2" />
              Estrutura da Rede
            </h2>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode(viewMode === 'tree' ? 'list' : 'tree')}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                {viewMode === 'tree' ? <Users className="w-4 h-4" /> : <TreePine className="w-4 h-4" />}
                <span className="text-white text-sm">
                  {viewMode === 'tree' ? 'Ver Lista' : 'Ver Árvore'}
                </span>
              </button>

              <button
                onClick={() => setShowInactive(!showInactive)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                {showInactive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="text-white text-sm">
                  {showInactive ? 'Ocultar Inativos' : 'Mostrar Inativos'}
                </span>
              </button>
            </div>
          </div>

          {viewMode === 'tree' ? (
            <TernaryNetworkTree maxLevels={10} />
          ) : (
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              {filteredMembers.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">
                    {showInactive ? 'Nenhum membro na rede' : 'Nenhum membro ativo'}
                  </h3>
                  <p className="text-gray-500">
                    {showInactive
                      ? 'Comece a indicar pessoas para construir sua rede MLM.'
                      : 'Nenhum membro ativo no período selecionado.'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {filteredMembers.map((member) => (
                    <div key={member.id} className="p-6 hover:bg-gray-700/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-white font-medium">{member.email}</h3>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${member.level === 1
                              ? 'bg-blue-600 text-white'
                              : member.level === 2
                                ? 'bg-green-600 text-white'
                                : 'bg-purple-600 text-white'
                              }`}>
                              Nível {member.level}
                            </span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${member.is_active_this_month
                              ? 'bg-green-900 text-green-300'
                              : 'bg-red-900 text-red-300'
                              }`}>
                              {member.is_active_this_month ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mt-1">
                            CPF: {member.cpf} • {member.total_purchases} compras
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            Entrou em {formatDate(member.created_at)} •
                            Última compra: {member.last_purchase_date ? formatDate(member.last_purchase_date) : 'Nunca'}
                          </p>
                        </div>

                        <div className="text-right">
                          <Target className="w-5 h-5 text-gray-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default NetworkPage;
