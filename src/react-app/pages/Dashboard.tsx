import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Layout from "@/react-app/components/Layout";

import { useAffiliateAuth } from "@/react-app/hooks/useAuth";
import { Wallet, Users, TrendingUp, Settings } from "lucide-react";

interface UserBalance {
  available_balance: number;
  frozen_balance: number;
  total_earnings: number;
  company_earnings: number;
  net_earnings: number;
  is_active_this_month: boolean;
  pix_key?: string;
}

interface NetworkStats {
  total_active: number;
  level1: number;
  level2: number;
  level3: number;
  level4: number;
  level5: number;
}

function Dashboard() {
  const navigate = useNavigate();
  const { user: affiliateUser, loading: authLoading } = useAffiliateAuth();
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyMessage, setCopyMessage] = useState<string>('');
  const [couponCopyMessage, setCouponCopyMessage] = useState<string>('');

  useEffect(() => {
    console.log('[DASHBOARD] useEffect triggered:', { authLoading, hasUser: !!affiliateUser });
    if (!authLoading && affiliateUser) {
      Promise.all([
        fetchBalance(),
        fetchNetworkStats()
      ]).finally(() => setLoading(false));
    } else if (!authLoading && !affiliateUser) {
      setLoading(false);
    }
  }, [affiliateUser, authLoading]);

  const fetchBalance = async () => {
    try {
      const headers: Record<string, string> = {};
      const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
      if (anon) headers['Authorization'] = `Bearer ${anon}`;
      const response = await fetch('/api/users/balance', {
        credentials: 'include',
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        setBalance(data);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchNetworkStats = async () => {
    try {
      const headers: Record<string, string> = {};
      const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
      if (anon) headers['Authorization'] = `Bearer ${anon}`;
      const response = await fetch('/api/network/stats', {
        credentials: 'include',
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        setNetworkStats(data);
      }
    } catch (error) {
      console.error('Error fetching network stats:', error);
    }
  };

  // Referral sharing functions
  const generateReferralLink = (referralCode: string): string => {
    const currentDomain = window.location.origin;
    return `${currentDomain}/cadastro?ref=${referralCode}`;
  };

  const copyReferralLink = async (referralCode: string) => {
    const referralLink = generateReferralLink(referralCode);
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopyMessage('Link copiado com sucesso!');
      setTimeout(() => setCopyMessage(''), 3000);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopyMessage('Link copiado com sucesso!');
      setTimeout(() => setCopyMessage(''), 3000);
    }
  };

  const shareWhatsApp = (referralCode: string) => {
    const referralLink = generateReferralLink(referralCode);
    const message = `🚀 Quer ganhar dinheiro com suas compras? 

Se cadastre no CashMais e ganhe cashback em todas as suas compras, além de comissões indicando outras pessoas!

💰 5% de cashback em compras
🎯 Sistema MLM de até 10 níveis  
💳 Saque fácil via PIX

👇 Use meu código e comece agora:
${referralLink}

#CashMais #Cashback #RendaExtra`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareGeneric = async (referralCode: string) => {
    const referralLink = generateReferralLink(referralCode);
    const message = `Ganhe dinheiro com suas compras no CashMais! Use meu código de indicação: ${referralLink}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'CashMais - Ganhe dinheiro com suas compras',
          text: message,
          url: referralLink,
        });
      } catch (error) {
        // If native sharing fails, copy to clipboard
        await copyReferralLink(referralCode);
      }
    } else {
      // Fallback to copying
      await copyReferralLink(referralCode);
    }
  };

  const copyCustomerCoupon = async (coupon: string) => {
    if (!coupon) return;
    
    try {
      await navigator.clipboard.writeText(coupon);
      setCouponCopyMessage('Cupom copiado com sucesso!');
      setTimeout(() => setCouponCopyMessage(''), 3000);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = coupon;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCouponCopyMessage('Cupom copiado com sucesso!');
      setTimeout(() => setCouponCopyMessage(''), 3000);
    }
  };

  if (authLoading || loading) {
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
        {/* Welcome Section */}
        <div className="bg-white/5 backdrop-blur-md border border-[#001144]/40 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-2">
            Bem-vindo ao CashMais, {affiliateUser?.full_name?.split(' ')[0] || 'Usuário'}!
          </h1>
          <p className="text-[#70ff00] mb-4 font-medium">
            Você está logado como Afiliado
          </p>
          <p className="text-[#70ff00]/80 text-sm">
            Ganhe comissões através da rede MLM
          </p>
          
          {/* Referral Code Section */}
          <div className="mt-4 p-4 bg-[#70ff00]/10 border border-[#70ff00]/30 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#70ff00] text-sm">
                <strong>Seu código de indicação:</strong> {affiliateUser?.referral_code}
              </p>
              <button
                onClick={() => copyReferralLink(affiliateUser?.referral_code || '')}
                className="px-3 py-1 bg-[#70ff00] text-[#001144] rounded-lg text-xs font-medium hover:bg-[#50cc00] transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path>
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path>
                </svg>
                Copiar Link
              </button>
            </div>
            <p className="text-[#70ff00]/80 text-xs">
              Compartilhe este código para ganhar comissões quando alguém se cadastrar
            </p>
            
            {/* Sharing Options */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => shareWhatsApp(affiliateUser?.referral_code || '')}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                  <path d="M11.893 5.5c2.998 0 5.434 2.434 5.435 5.433-.001 2.998-2.438 5.432-5.435 5.432-.923 0-1.79-.233-2.547-.644l-2.181.572.581-2.121c-.479-.819-.771-1.773-.771-2.798 0-2.998 2.435-5.433 5.435-5.433zm-3.128 7.638c.247.138.531.218.834.218.965 0 1.766-.578 2.115-1.404h.002c.349-.826.155-1.774-.467-2.305-.311-.265-.7-.42-1.124-.42-.965 0-1.766.801-1.766 1.789 0 .5.207.952.542 1.279z"/>
                </svg>
                WhatsApp
              </button>
              
              <button
                onClick={() => shareGeneric(affiliateUser?.referral_code || '')}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"></path>
                </svg>
                Compartilhar
              </button>
            </div>
            
            {copyMessage && (
              <div className="mt-2 p-2 bg-green-600/20 border border-green-500/30 rounded-lg">
                <p className="text-green-300 text-xs text-center">{copyMessage}</p>
              </div>
            )}
          </div>
          
          {/* Customer Coupon Section */}
          <div className="mt-4 p-4 bg-blue-600/10 border border-blue-500/30 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-blue-400 text-sm">
                <strong>Seu cupom para compras:</strong> {affiliateUser?.customer_coupon || affiliateUser?.cpf || 'Carregando...'}
              </p>
              <button
                onClick={() => copyCustomerCoupon(affiliateUser?.customer_coupon || affiliateUser?.cpf || '')}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path>
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path>
                </svg>
                Copiar
              </button>
            </div>
            <p className="text-blue-400/80 text-xs">
              💳 Mostre este cupom (seu CPF) no estabelecimento para receber cashback nas suas compras
            </p>
            
            {couponCopyMessage && (
              <div className="mt-2 p-2 bg-green-600/20 border border-green-500/30 rounded-lg">
                <p className="text-green-300 text-xs text-center">{couponCopyMessage}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-md border border-[#001144]/40 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Disponível p/ Saque</h3>
              <Wallet className="w-5 h-5 text-[#70ff00]" />
            </div>
            <p className="text-3xl font-bold text-white">
              R$ {balance ? balance.available_balance.toFixed(2) : '0,00'}
            </p>
            <p className="text-sm text-[#70ff00]/80 mt-2">Valor líquido</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-[#001144]/40 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Rede Ativa</h3>
              <Users className="w-5 h-5 text-[#70ff00]" />
            </div>
            <p className="text-3xl font-bold text-white">
              {networkStats ? networkStats.total_active : 0}
            </p>
            <p className="text-sm text-[#70ff00]/80 mt-2">Afiliados ativos</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-[#001144]/40 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Seus Ganhos</h3>
              <TrendingUp className="w-5 h-5 text-[#70ff00]" />
            </div>
            <p className="text-3xl font-bold text-white">
              R$ {balance ? balance.net_earnings.toFixed(2) : '0,00'}
            </p>
            <p className="text-sm text-[#70ff00]/80 mt-2">Total líquido</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/5 backdrop-blur-md border border-[#001144]/40 rounded-3xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/extrato')}
              className="p-4 bg-white/5 backdrop-blur-md border border-[#001144]/20 rounded-2xl hover:bg-[#70ff00]/10 hover:border-[#70ff00]/30 hover:scale-[1.02] transition-all text-left"
            >
              <Wallet className="w-6 h-6 text-[#70ff00] mb-2" />
              <h3 className="text-white font-medium">Ver Extrato</h3>
              <p className="text-[#70ff00]/80 text-sm">Histórico de cashback</p>
            </button>

            <button
              onClick={() => navigate('/rede')}
              className="p-4 bg-white/5 backdrop-blur-md border border-[#001144]/20 rounded-2xl hover:bg-[#70ff00]/10 hover:border-[#70ff00]/30 hover:scale-[1.02] transition-all text-left"
            >
              <Users className="w-6 h-6 text-[#70ff00] mb-2" />
              <h3 className="text-white font-medium">Minha Rede</h3>
              <p className="text-[#70ff00]/80 text-sm">Gerenciar afiliados</p>
            </button>

            <button
              onClick={() => navigate('/saque')}
              className="p-4 bg-white/5 backdrop-blur-md border border-[#001144]/20 rounded-2xl hover:bg-[#70ff00]/10 hover:border-[#70ff00]/30 hover:scale-[1.02] transition-all text-left"
            >
              <TrendingUp className="w-6 h-6 text-[#70ff00] mb-2" />
              <h3 className="text-white font-medium">Solicitar Saque</h3>
              <p className="text-[#70ff00]/80 text-sm">Retirar ganhos</p>
            </button>

            <button
              onClick={() => navigate('/configuracoes')}
              className="p-4 bg-white/5 backdrop-blur-md border border-[#001144]/20 rounded-2xl hover:bg-[#70ff00]/10 hover:border-[#70ff00]/30 hover:scale-[1.02] transition-all text-left"
            >
              <Settings className="w-6 h-6 text-[#70ff00] mb-2" />
              <h3 className="text-white font-medium">Configurações</h3>
              <p className="text-[#70ff00]/80 text-sm">PIX e preferências</p>
            </button>
          </div>
        </div>

        {/* Status Section */}
        <div className="bg-white/5 backdrop-blur-md border border-[#001144]/40 rounded-3xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4">Status da Conta</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white">Email verificado</span>
              <span className="text-[#70ff00] text-sm">✓ Verificado</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white">CPF cadastrado</span>
              <span className="text-[#70ff00] text-sm">✓ Cadastrado</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white">Conta ativada</span>
              <span className="text-[#70ff00] text-sm">✓ Ativa</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white">PIX configurado</span>
              <span className={balance?.pix_key ? "text-[#70ff00] text-sm" : "text-yellow-400 text-sm"}>
                {balance?.pix_key ? "✓ Configurado" : "⚠ Pendente"}
              </span>
            </div>
          </div>
          
          {/* Customer Coupon Section */}
          <div className="mt-4 p-4 bg-blue-600/10 border border-blue-500/30 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-blue-400 text-sm">
                <strong>Seu cupom para compras:</strong> {affiliateUser?.customer_coupon || affiliateUser?.cpf || 'Carregando...'}
              </p>
              <button
                onClick={() => copyCustomerCoupon(affiliateUser?.customer_coupon || affiliateUser?.cpf || '')}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path>
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path>
                </svg>
                Copiar
              </button>
            </div>
            <p className="text-blue-400/80 text-xs">
              💳 Mostre este cupom (seu CPF) no estabelecimento para receber cashback nas suas compras
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
