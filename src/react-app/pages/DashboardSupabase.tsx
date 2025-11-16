import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Layout from "@/react-app/components/Layout";
import { useAffiliateAuth } from "@/react-app/hooks/useAuth";
import { useAffiliateBalance, useAffiliateTransactions, useNetworkMembers } from "@/react-app/hooks/useSupabase";
import { Wallet, Users, TrendingUp, Settings, Copy, Share2, MessageCircle } from "lucide-react";

function Dashboard() {
  const navigate = useNavigate();
  const { user: affiliateUser, loading: authLoading } = useAffiliateAuth();
  const { balance, loading: balanceLoading } = useAffiliateBalance(affiliateUser?.cpf || '');
  const { transactions, loading: transactionsLoading } = useAffiliateTransactions(affiliateUser?.cpf || '', 10);
  const { network, loading: networkLoading } = useNetworkMembers(affiliateUser?.cpf || '');
  
  const [copyMessage, setCopyMessage] = useState<string>('');
  const [couponCopyMessage, setCouponCopyMessage] = useState<string>('');

  useEffect(() => {
    console.log('[DASHBOARD] Dados carregados:', { 
      user: affiliateUser, 
      balance, 
      transactions: transactions.length, 
      network 
    });
  }, [affiliateUser, balance, transactions, network]);

  // Funções de compartilhamento
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
      // Fallback para navegadores que não suportam clipboard API
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
        await copyReferralLink(referralCode);
      }
    } else {
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

  if (authLoading || balanceLoading || networkLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-8 h-8 bg-gradient-to-r from-[#70ff00] to-[#50cc00] rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!affiliateUser) {
    return null;
  }

  // Cria objeto de usuário compatível para o layout
  const displayUser = {
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
  };

  return (
    <Layout user={displayUser}>
      <div className="space-y-8">
        {/* Seção de Boas-vindas */}
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
          
          {/* Seção do Código de Indicação */}
          <div className="mt-4 p-4 bg-[#70ff00]/10 border border-[#70ff00]/30 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#70ff00] text-sm">
                <strong>Seu código de indicação:</strong> {affiliateUser?.referral_code}
              </p>
              <button
                onClick={() => copyReferralLink(affiliateUser?.referral_code || '')}
                className="px-3 py-1 bg-[#70ff00] text-[#001144] rounded-lg text-xs font-medium hover:bg-[#50cc00] transition-colors flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Copiar Link
              </button>
            </div>
            <p className="text-[#70ff00]/80 text-xs">
              Compartilhe este código para ganhar comissões quando alguém se cadastrar
            </p>
            
            {/* Opções de Compartilhamento */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => shareWhatsApp(affiliateUser?.referral_code || '')}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
              >
                <MessageCircle className="w-3 h-3" />
                WhatsApp
              </button>
              <button
                onClick={() => shareGeneric(affiliateUser?.referral_code || '')}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
              >
                <Share2 className="w-3 h-3" />
                Compartilhar
              </button>
            </div>
          </div>

          {copyMessage && (
            <div className="mt-2 text-xs text-[#70ff00] bg-[#70ff00]/10 px-3 py-1 rounded-lg">
              {copyMessage}
            </div>
          )}
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Saldo Disponível */}
          <div className="bg-white/5 backdrop-blur-md border border-[#001144]/40 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <Wallet className="w-8 h-8 text-[#70ff00]" />
              <span className="text-xs text-[#70ff00]/60 font-medium">SALDO</span>
            </div>
            <h3 className="text-white/60 text-sm mb-1">Disponível para saque</h3>
            <p className="text-2xl font-bold text-[#70ff00]">
              R$ {balance?.available_balance?.toFixed(2) || '0.00'}
            </p>
            <button
              onClick={() => navigate('/saque')}
              className="mt-3 w-full bg-[#70ff00] text-[#001144] py-2 rounded-lg text-sm font-medium hover:bg-[#50cc00] transition-colors"
            >
              Sacar
            </button>
          </div>

          {/* Total Ganho */}
          <div className="bg-white/5 backdrop-blur-md border border-[#001144]/40 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-[#70ff00]" />
              <span className="text-xs text-[#70ff00]/60 font-medium">GANHOS</span>
            </div>
            <h3 className="text-white/60 text-sm mb-1">Total ganho</h3>
            <p className="text-2xl font-bold text-[#70ff00]">
              R$ {balance?.total_earned?.toFixed(2) || '0.00'}
            </p>
            <div className="mt-3 text-xs text-[#70ff00]/60">
              Desde {new Date(affiliateUser.created_at).toLocaleDateString('pt-BR')}
            </div>
          </div>

          {/* Rede de Indicados */}
          <div className="bg-white/5 backdrop-blur-md border border-[#001144]/40 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-[#70ff00]" />
              <span className="text-xs text-[#70ff00]/60 font-medium">REDE</span>
            </div>
            <h3 className="text-white/60 text-sm mb-1">Indicados ativos</h3>
            <p className="text-2xl font-bold text-[#70ff00]">
              {network.level1.length + network.level2.length + network.level3.length}
            </p>
            <div className="mt-3 text-xs text-[#70ff00]/60">
              N1: {network.level1.length} | N2: {network.level2.length} | N3: {network.level3.length}
            </div>
          </div>

          {/* Configurações */}
          <div className="bg-white/5 backdrop-blur-md border border-[#001144]/40 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <Settings className="w-8 h-8 text-[#70ff00]" />
              <span className="text-xs text-[#70ff00]/60 font-medium">CONFIG</span>
            </div>
            <h3 className="text-white/60 text-sm mb-1">Meu cupom</h3>
            <p className="text-lg font-bold text-[#70ff00] font-mono">
              {affiliateUser.cpf}
            </p>
            <button
              onClick={() => copyCustomerCoupon(affiliateUser.cpf)}
              className="mt-3 w-full bg-[#001144] text-[#70ff00] py-2 rounded-lg text-sm font-medium hover:bg-[#001144]/80 transition-colors border border-[#70ff00]/30"
            >
              Copiar Cupom
            </button>
            {couponCopyMessage && (
              <div className="mt-2 text-xs text-[#70ff00] text-center">
                {couponCopyMessage}
              </div>
            )}
          </div>
        </div>

        {/* Seção de Transações Recentes */}
        <div className="bg-white/5 backdrop-blur-md border border-[#001144]/40 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Transações Recentes</h2>
            <button
              onClick={() => navigate('/extrato')}
              className="text-[#70ff00] hover:text-[#50cc00] text-sm font-medium transition-colors"
            >
              Ver todas →
            </button>
          </div>

          {transactionsLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse text-[#70ff00]/60">Carregando transações...</div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-[#70ff00]/60 mb-4">Nenhuma transação encontrada</div>
              <p className="text-white/60 text-sm">
                Use seu cupom {affiliateUser.cpf} nas lojas parceiras para ganhar cashback!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-[#001144]/30">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#70ff00]/20 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-[#70ff00]" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{transaction.company_name}</p>
                      <p className="text-[#70ff00]/60 text-sm">
                        {new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">R$ {transaction.purchase_value.toFixed(2)}</p>
                    <p className="text-[#70ff00] text-sm">+R$ {transaction.cashback_value.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seção de Indicações */}
        <div className="bg-white/5 backdrop-blur-md border border-[#001144]/40 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Sua Rede</h2>
            <button
              onClick={() => navigate('/rede')}
              className="text-[#70ff00] hover:text-[#50cc00] text-sm font-medium transition-colors"
            >
              Ver todos →
            </button>
          </div>

          {networkLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse text-[#70ff00]/60">Carregando rede...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Nível 1 */}
              <div className="text-center p-6 bg-white/5 rounded-xl border border-[#001144]/30">
                <div className="w-12 h-12 bg-[#70ff00]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-[#70ff00]" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">Nível 1</h3>
                <p className="text-2xl font-bold text-[#70ff00]">{network.level1.length}</p>
                <p className="text-[#70ff00]/60 text-sm">Indicados diretos</p>
              </div>

              {/* Nível 2 */}
              <div className="text-center p-6 bg-white/5 rounded-xl border border-[#001144]/30">
                <div className="w-12 h-12 bg-[#70ff00]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-[#70ff00]" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">Nível 2</h3>
                <p className="text-2xl font-bold text-[#70ff00]">{network.level2.length}</p>
                <p className="text-[#70ff00]/60 text-sm">Indicados indiretos</p>
              </div>

              {/* Nível 3 */}
              <div className="text-center p-6 bg-white/5 rounded-xl border border-[#001144]/30">
                <div className="w-12 h-12 bg-[#70ff00]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-[#70ff00]" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">Nível 3</h3>
                <p className="text-2xl font-bold text-[#70ff00]">{network.level3.length}</p>
                <p className="text-[#70ff00]/60 text-sm">Terceiro nível</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;