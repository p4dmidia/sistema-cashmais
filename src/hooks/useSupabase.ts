import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Hook para autenticação de afiliados
export function useAffiliateAuth() {
  const [affiliate, setAffiliate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAffiliateSession();
  }, []);

  const checkAffiliateSession = async () => {
    try {
      setLoading(true);
      
      // Get session token from cookie or localStorage
      const sessionToken = localStorage.getItem('affiliate_session');
      
      if (!sessionToken) {
        setAffiliate(null);
        return;
      }

      // Get current affiliate user
      const { data, error } = await supabase
        .from('affiliate_sessions')
        .select(`
          *,
          affiliates!inner(*)
        `)
        .eq('session_token', sessionToken)
        .eq('affiliates.is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        setAffiliate(null);
        localStorage.removeItem('affiliate_session');
        return;
      }

      setAffiliate(data.affiliates);
    } catch (err) {
      console.error('Error checking affiliate session:', err);
      setError('Erro ao verificar sessão');
      setAffiliate(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (cpf: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get affiliate by CPF
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('cpf', cpf)
        .eq('is_active', true)
        .single();

      if (affiliateError || !affiliate) {
        throw new Error('Credenciais inválidas');
      }

      // Simple password check (you should implement proper password hashing)
      if (affiliate.password_hash !== password) {
        throw new Error('Credenciais inválidas');
      }

      // Create session
      const sessionToken = crypto.randomUUID() + "-" + Date.now();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const { error: sessionError } = await supabase
        .from('affiliate_sessions')
        .insert({
          affiliate_id: affiliate.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          ip_address: 'unknown',
          user_agent: 'unknown'
        });

      if (sessionError) {
        throw new Error('Erro ao criar sessão');
      }

      // Store session token
      localStorage.setItem('affiliate_session', sessionToken);
      
      // Update last login
      await supabase
        .from('affiliates')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', affiliate.id);

      setAffiliate(affiliate);
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const sessionToken = localStorage.getItem('affiliate_session');
      if (sessionToken) {
        await supabase
          .from('affiliate_sessions')
          .delete()
          .eq('session_token', sessionToken);
      }
      
      localStorage.removeItem('affiliate_session');
      setAffiliate(null);
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  return {
    affiliate,
    loading,
    error,
    login,
    logout,
    checkAffiliateSession
  };
}

// Hook para dados do afiliado
export function useAffiliateData(affiliateId: number | null) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (affiliateId) {
      fetchAffiliateData();
    }
  }, [affiliateId]);

  const fetchAffiliateData = async () => {
    try {
      setLoading(true);
      
      // Get affiliate basic info
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', affiliateId)
        .single();

      if (affiliateError) {
        throw new Error('Erro ao buscar dados do afiliado');
      }

      // Get network stats
      const { count: networkCount } = await supabase
        .from('affiliates')
        .select('*', { count: 'exact', head: true })
        .eq('sponsor_id', affiliateId)
        .eq('is_active', true);

      // Get earnings
      const mochaUserId = `affiliate_${affiliateId}`;
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('total_earnings, available_balance')
        .eq('user_id', mochaUserId)
        .single();

      // Get recent transactions
      const { data: transactions } = await supabase
        .from('commission_distributions')
        .select(`
          *,
          company_purchases!inner(
            purchase_value,
            cashback_generated,
            companies!inner(nome_fantasia)
          )
        `)
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false })
        .limit(10);

      setData({
        affiliate,
        networkCount: networkCount || 0,
        earnings: userSettings || { total_earnings: 0, available_balance: 0 },
        transactions: transactions || []
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch: fetchAffiliateData };
}

// Hook para transações e comissões
export function useAffiliateTransactions(affiliateId: number | null) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (affiliateId) {
      fetchTransactions();
    }
  }, [affiliateId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('commission_distributions')
        .select(`
          *,
          company_purchases!inner(
            id,
            purchase_value,
            cashback_generated,
            created_at,
            companies!inner(nome_fantasia)
          )
        `)
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new Error('Erro ao buscar transações');
      }

      setTransactions(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { transactions, loading, error, refetch: fetchTransactions };
}

// Hook para rede de indicações
export function useAffiliateNetwork(affiliateId: number | null) {
  const [network, setNetwork] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (affiliateId) {
      fetchNetwork();
    }
  }, [affiliateId]);

  const fetchNetwork = async () => {
    try {
      setLoading(true);
      
      // Get direct referrals (level 1)
      const { data: directReferrals, error: directError } = await supabase
        .from('affiliates')
        .select(`
          id,
          full_name,
          email,
          cpf,
          created_at,
          is_active
        `)
        .eq('sponsor_id', affiliateId)
        .order('created_at', { ascending: false });

      if (directError) {
        throw new Error('Erro ao buscar rede de indicações');
      }

      // Get level 2 referrals
      const directIds = directReferrals?.map(r => r.id) || [];
      let level2Referrals: any[] = [];
      
      if (directIds.length > 0) {
        const { data: level2Data } = await supabase
          .from('affiliates')
          .select(`
            id,
            full_name,
            email,
            cpf,
            created_at,
            is_active,
            sponsor_id
          `)
          .in('sponsor_id', directIds)
          .order('created_at', { ascending: false });
        
        level2Referrals = level2Data || [];
      }

      setNetwork([
        ...(directReferrals?.map(r => ({ ...r, level: 1 })) || []),
        ...(level2Referrals?.map(r => ({ ...r, level: 2 })) || [])
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { network, loading, error, refetch: fetchNetwork };
}

// Hook para saques
export function useWithdrawals(affiliateId: number | null) {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (affiliateId) {
      fetchWithdrawals();
    }
  }, [affiliateId]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      
      const mochaUserId = `affiliate_${affiliateId}`;
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', mochaUserId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error('Erro ao buscar saques');
      }

      setWithdrawals(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createWithdrawal = async (amount: number, pixKey: string) => {
    try {
      const mochaUserId = `affiliate_${affiliateId}`;
      
      // Check available balance
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('available_balance')
        .eq('user_id', mochaUserId)
        .single();

      if (!userSettings || userSettings.available_balance < amount) {
        throw new Error('Saldo insuficiente');
      }

      // Create withdrawal
      const { error: withdrawalError } = await supabase
        .from('withdrawals')
        .insert({
          user_id: mochaUserId,
          amount,
          pix_key: pixKey,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (withdrawalError) {
        throw new Error('Erro ao criar saque');
      }

      // Update balance
      const { error: balanceError } = await supabase
        .from('user_settings')
        .update({ 
          available_balance: userSettings.available_balance - amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', mochaUserId);

      if (balanceError) {
        throw new Error('Erro ao atualizar saldo');
      }

      await fetchWithdrawals();
      return { success: true };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  return { withdrawals, loading, error, createWithdrawal, refetch: fetchWithdrawals };
}

// Hook para empresas e compras
export function useCompanies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          company_categories(name)
        `)
        .eq('is_active', true)
        .order('nome_fantasia', { ascending: true });

      if (error) {
        throw new Error('Erro ao buscar empresas');
      }

      setCompanies(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { companies, loading, error, refetch: fetchCompanies };
}

// Hook para estatísticas gerais
export function useDashboardStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get total affiliates
      const { count: totalAffiliates } = await supabase
        .from('affiliates')
        .select('*', { count: 'exact', head: true });

      // Get active affiliates (logged in this month)
      const { count: activeAffiliates } = await supabase
        .from('affiliates')
        .select('*', { count: 'exact', head: true })
        .gte('last_login_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      // Get total companies
      const { count: totalCompanies } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get total purchases this month
      const { count: monthlyPurchases } = await supabase
        .from('company_purchases')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      // Get total cashback generated this month
      const { data: monthlyCashback } = await supabase
        .from('company_purchases')
        .select('cashback_generated')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      const totalMonthlyCashback = monthlyCashback?.reduce((sum, item) => sum + (item.cashback_generated || 0), 0) || 0;

      setStats({
        totalAffiliates: totalAffiliates || 0,
        activeAffiliates: activeAffiliates || 0,
        totalCompanies: totalCompanies || 0,
        monthlyPurchases: monthlyPurchases || 0,
        monthlyCashback: totalMonthlyCashback
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, error, refetch: fetchStats };
}