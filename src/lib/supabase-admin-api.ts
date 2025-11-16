import { supabase } from './supabase';

// Get current admin user
export async function getCurrentAdminUser(sessionToken: string) {
  try {
    const { data: session, error: sessionError } = await supabase
      .from('admin_sessions')
      .select(`
        *,
        admin_users!inner(*)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .eq('admin_users.is_active', true)
      .single();

    if (sessionError || !session) {
      return { error: 'Sessão inválida' };
    }

    const { data: fullAdminData, error: adminError } = await supabase
      .from('admin_users')
      .select('id, username, email, full_name, is_active, last_login_at, created_at')
      .eq('id', session.admin_user_id)
      .single();

    if (adminError) {
      console.error('Get admin user error:', adminError);
      return { error: 'Usuário não encontrado' };
    }

    return { admin: fullAdminData };
  } catch (error) {
    console.error('Get current admin user error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Get admin dashboard stats
export async function getAdminDashboardStats() {
  try {
    // Total affiliates (all active)
    const { count: totalAffiliates } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Total active companies
    const { count: totalCompanies } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Pending withdrawals - count and total amount
    const { data: pendingWithdrawals, error: pendingError } = await supabase
      .from('withdrawals')
      .select('amount_requested')
      .eq('status', 'pending');

    if (pendingError) {
      console.error('Get pending withdrawals error:', pendingError);
    }

    const pendingCount = pendingWithdrawals?.length || 0;
    const pendingAmount = pendingWithdrawals?.reduce((sum, w) => sum + (w.amount_requested || 0), 0) || 0;

    // Get current month in format YYYY-MM
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const thisMonth = `${year}-${month}`;

    // Total cashback generated this month
    const { data: cashbackThisMonth, error: cashbackError } = await supabase
      .from('company_purchases')
      .select('cashback_generated')
      .filter('purchase_date', 'gte', `${thisMonth}-01`)
      .filter('purchase_date', 'lt', new Date(year, now.getMonth() + 1, 1).toISOString().split('T')[0]);

    if (cashbackError) {
      console.error('Get cashback this month error:', cashbackError);
    }

    const totalCashbackThisMonth = cashbackThisMonth?.reduce((sum, p) => sum + (p.cashback_generated || 0), 0) || 0;

    // Recent purchases (last 10)
    const { data: recentPurchases, error: purchasesError } = await supabase
      .from('company_purchases')
      .select(`
        id,
        purchase_value,
        cashback_generated,
        purchase_date,
        customer_coupon,
        companies!inner(nome_fantasia)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (purchasesError) {
      console.error('Get recent purchases error:', purchasesError);
    }

    return {
      stats: {
        totalAffiliates: totalAffiliates || 0,
        totalCompanies: totalCompanies || 0,
        pendingWithdrawals: {
          count: pendingCount,
          totalAmount: pendingAmount
        },
        cashbackThisMonth: totalCashbackThisMonth
      },
      recentPurchases: recentPurchases || []
    };
  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Get admin dashboard charts data
export async function getAdminDashboardCharts() {
  try {
    // Get monthly purchase data
    const { data: monthlyPurchaseData, error: purchaseError } = await supabase
      .from('company_purchases')
      .select(`
        purchase_date,
        companies!inner(id)
      `)
      .gte('purchase_date', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (purchaseError) {
      console.error('Get monthly purchase data error:', purchaseError);
    }

    // Get affiliate signup data
    const { data: monthlyAffiliateData, error: affiliateError } = await supabase
      .from('affiliates')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString());

    if (affiliateError) {
      console.error('Get monthly affiliate data error:', affiliateError);
    }

    // Process monthly stats
    const monthlyStatsMap = new Map();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Process purchase data
    if (monthlyPurchaseData) {
      monthlyPurchaseData.forEach(purchase => {
        const monthKey = purchase.purchase_date.substring(0, 7); // YYYY-MM
        const existing = monthlyStatsMap.get(monthKey) || {
          month: monthNames[parseInt(monthKey.split('-')[1]) - 1],
          purchases: 0,
          cashback: 0,
          companies: new Set(),
          affiliates: 0
        };
        
        existing.purchases++;
        existing.companies.add(purchase.companies.id);
        monthlyStatsMap.set(monthKey, existing);
      });
    }

    // Process affiliate data
    if (monthlyAffiliateData) {
      monthlyAffiliateData.forEach(affiliate => {
        const monthKey = affiliate.created_at.substring(0, 7); // YYYY-MM
        const existing = monthlyStatsMap.get(monthKey) || {
          month: monthNames[parseInt(monthKey.split('-')[1]) - 1],
          purchases: 0,
          cashback: 0,
          companies: new Set(),
          affiliates: 0
        };
        
        existing.affiliates++;
        monthlyStatsMap.set(monthKey, existing);
      });
    }

    const formattedMonthlyStats = Array.from(monthlyStatsMap.values()).map(stat => ({
      ...stat,
      companies: stat.companies.size
    }));

    // Get current counts for status distribution
    const { count: totalAffiliates } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: totalCompanies } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: pendingWithdrawals } = await supabase
      .from('withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const statusDistribution = [
      { 
        name: 'Afiliados Ativos', 
        value: totalAffiliates || 0, 
        color: '#10b981' 
      },
      { 
        name: 'Empresas Ativas', 
        value: totalCompanies || 0, 
        color: '#3b82f6' 
      },
      { 
        name: 'Saques Pendentes', 
        value: pendingWithdrawals || 0, 
        color: '#f59e0b' 
      }
    ];

    // Weekly growth data (last 7 days)
    const weeklyGrowthData = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Get affiliate signups for this day
      const { count: affiliateCount } = await supabase
        .from('affiliates')
        .select('*', { count: 'exact', head: true })
        .eq('created_at::date', dateStr);
      
      // Get company signups for this day
      const { count: companyCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('created_at::date', dateStr);
      
      // Get purchases for this day
      const { count: purchaseCount } = await supabase
        .from('company_purchases')
        .select('*', { count: 'exact', head: true })
        .eq('purchase_date', dateStr);

      weeklyGrowthData.push({
        day: dayNames[date.getDay()],
        newAffiliates: affiliateCount || 0,
        newCompanies: companyCount || 0,
        totalPurchases: purchaseCount || 0
      });
    }

    return {
      monthlyStats: formattedMonthlyStats,
      statusDistribution,
      weeklyGrowth: weeklyGrowthData
    };
  } catch (error) {
    console.error('Admin dashboard charts error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Get withdrawals with status filter
export async function getWithdrawals(status = 'pending', page = 1, limit = 20) {
  try {
    const offset = (page - 1) * limit;

    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('withdrawals')
      .select(`
        *,
        user_profiles!inner(mocha_user_id)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (withdrawalsError) {
      console.error('Get withdrawals error:', withdrawalsError);
      return { error: 'Erro interno do servidor' };
    }

    // Enhance with affiliate info
    const enhancedWithdrawals = [];
    for (const withdrawal of withdrawals || []) {
      // Extract affiliate ID from mocha_user_id (format: affiliate_123)
      const affiliateId = withdrawal.user_profiles.mocha_user_id?.replace('affiliate_', '');
      
      if (affiliateId && !isNaN(parseInt(affiliateId))) {
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('full_name, cpf, email')
          .eq('id', parseInt(affiliateId))
          .single();
        
        enhancedWithdrawals.push({
          ...withdrawal,
          full_name: affiliate?.full_name || 'N/A',
          cpf: affiliate?.cpf || 'N/A',
          email: affiliate?.email || 'N/A'
        });
      } else {
        enhancedWithdrawals.push({
          ...withdrawal,
          full_name: 'N/A',
          cpf: 'N/A',
          email: 'N/A'
        });
      }
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);

    const totalCountValue = totalCount || 0;

    return {
      withdrawals: enhancedWithdrawals,
      pagination: {
        page,
        limit,
        total: totalCountValue,
        totalPages: Math.ceil(totalCountValue / limit)
      }
    };
  } catch (error) {
    console.error('Get withdrawals error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Update withdrawal status
export async function updateWithdrawalStatus(withdrawalId: string, status: 'approved' | 'rejected', notes?: string, adminUserId?: number) {
  try {
    // Get withdrawal details
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .single();

    if (withdrawalError || !withdrawal) {
      return { error: 'Saque não encontrado' };
    }

    if (withdrawal.status !== 'pending') {
      return { error: 'Saque já foi processado' };
    }

    // Update withdrawal
    const { error: updateError } = await supabase
      .from('withdrawals')
      .update({
        status,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawalId);

    if (updateError) {
      console.error('Update withdrawal error:', updateError);
      return { error: 'Erro interno do servidor' };
    }

    // If approved, update user balance
    if (status === 'approved') {
      const { error: balanceError } = await supabase
        .from('user_settings')
        .update({
          available_balance: withdrawal.net_amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', withdrawal.user_id)
        .single();

      if (balanceError) {
        console.error('Update user balance error:', balanceError);
        return { error: 'Erro interno do servidor' };
      }
    } else {
      // If rejected, return frozen balance to available
      const { error: balanceError } = await supabase
        .from('user_settings')
        .update({
          available_balance: withdrawal.net_amount,
          frozen_balance: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', withdrawal.user_id)
        .single();

      if (balanceError) {
        console.error('Update user balance error:', balanceError);
        return { error: 'Erro interno do servidor' };
      }
    }

    // Log action
    if (adminUserId) {
      const { error: logError } = await supabase
        .from('admin_audit_logs')
        .insert({
          admin_user_id: adminUserId,
          action: status === 'approved' ? 'APPROVE_WITHDRAWAL' : 'REJECT_WITHDRAWAL',
          entity_type: 'withdrawal',
          entity_id: withdrawalId,
          old_data: JSON.stringify({ status: withdrawal.status }),
          new_data: JSON.stringify({ status, notes })
        });

      if (logError) {
        console.error('Log admin action error:', logError);
      }
    }

    return { 
      success: true, 
      message: `Saque ${status === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso` 
    };
  } catch (error) {
    console.error('Update withdrawal status error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Get global affiliates statistics
export async function getAffiliatesStats() {
  try {
    // Total active affiliates
    const { count: totalActive } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Total inactive affiliates
    const { count: totalInactive } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false);

    // Total cashback generated by all affiliates
    const { data: cashbackData, error: cashbackError } = await supabase
      .from('company_purchases')
      .select('cashback_generated');

    if (cashbackError) {
      console.error('Get total cashback error:', cashbackError);
    }

    const totalCashbackGenerated = cashbackData?.reduce((sum, p) => sum + (p.cashback_generated || 0), 0) || 0;

    // Total pending commissions (70% of cashback goes to network)
    const totalCommissionsPending = totalCashbackGenerated * 0.70;

    // New affiliates this month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const thisMonth = `${year}-${month}`;
    
    const { count: newAffiliatesThisMonth } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${thisMonth}-01`)
      .lt('created_at', new Date(year, now.getMonth() + 1, 1).toISOString());

    return {
      totalActive: totalActive || 0,
      totalInactive: totalInactive || 0,
      totalCashbackGenerated,
      totalCommissionsPending,
      newAffiliatesThisMonth: newAffiliatesThisMonth || 0
    };
  } catch (error) {
    console.error('Get affiliates stats error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Get affiliates with search and pagination
export async function getAffiliates(page = 1, limit = 20, search = '') {
  try {
    const offset = (page - 1) * limit;

    // Build query with search
    let query = supabase
      .from('affiliates')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,cpf.ilike.%${search}%`);
    }

    // Get total count for pagination
    const { count: totalCount } = await query;

    // Get paginated results
    const { data: affiliates, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get affiliates error:', error);
      return { error: 'Erro interno do servidor' };
    }

    // Calculate additional fields efficiently
    const enrichedAffiliates = [];
    for (const affiliate of affiliates || []) {
      // Count direct referrals
      const { count: directReferrals } = await supabase
        .from('affiliates')
        .select('*', { count: 'exact', head: true })
        .eq('sponsor_id', affiliate.id);

      // Calculate total cashback
      const { data: purchases } = await supabase
        .from('company_purchases')
        .select('cashback_generated')
        .eq('customer_coupon', affiliate.cpf);

      const totalCashback = purchases?.reduce((sum, p) => sum + (p.cashback_generated || 0), 0) || 0;

      enrichedAffiliates.push({
        ...affiliate,
        direct_referrals: directReferrals || 0,
        total_cashback: totalCashback,
        pending_commissions: totalCashback * 0.7 // 70% of generated cashback as pending commissions
      });
    }

    const totalCountValue = totalCount || 0;

    return {
      affiliates: enrichedAffiliates,
      pagination: {
        page,
        limit,
        total: totalCountValue,
        totalPages: Math.ceil(totalCountValue / limit)
      }
    };
  } catch (error) {
    console.error('Get affiliates error:', error);
    return { 
      error: 'Erro ao buscar afiliados',
      affiliates: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    };
  }
}

// Update affiliate details
export async function updateAffiliate(affiliateId: string, updates: {
  full_name: string;
  email: string;
  whatsapp?: string;
}, adminUserId?: number) {
  try {
    // Get current affiliate
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', affiliateId)
      .single();

    if (affiliateError || !affiliate) {
      return { error: 'Afiliado não encontrado' };
    }

    // Check if email is already in use by another affiliate
    const { data: emailCheck } = await supabase
      .from('affiliates')
      .select('id')
      .eq('email', updates.email)
      .neq('id', affiliateId)
      .single();

    if (emailCheck) {
      return { error: 'Email já está em uso por outro afiliado' };
    }

    // Update affiliate
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        full_name: updates.full_name,
        email: updates.email,
        whatsapp: updates.whatsapp || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliateId);

    if (updateError) {
      console.error('Update affiliate error:', updateError);
      return { error: 'Erro interno do servidor' };
    }

    // Log action
    if (adminUserId) {
      const { error: logError } = await supabase
        .from('admin_audit_logs')
        .insert({
          admin_user_id: adminUserId,
          action: 'UPDATE_AFFILIATE',
          entity_type: 'affiliate',
          entity_id: affiliateId,
          old_data: JSON.stringify({ 
            full_name: affiliate.full_name, 
            email: affiliate.email, 
            whatsapp: affiliate.whatsapp 
          }),
          new_data: JSON.stringify(updates)
        });

      if (logError) {
        console.error('Log admin action error:', logError);
      }
    }

    return { 
      success: true, 
      message: 'Afiliado atualizado com sucesso'
    };
  } catch (error) {
    console.error('Update affiliate error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Toggle affiliate status
export async function toggleAffiliateStatus(affiliateId: string, adminUserId?: number) {
  try {
    // Get current affiliate
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', affiliateId)
      .single();

    if (affiliateError || !affiliate) {
      return { error: 'Afiliado não encontrado' };
    }

    const newStatus = !affiliate.is_active;

    // Update status
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        is_active: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliateId);

    if (updateError) {
      console.error('Toggle affiliate status error:', updateError);
      return { error: 'Erro interno do servidor' };
    }

    // Log action
    if (adminUserId) {
      const { error: logError } = await supabase
        .from('admin_audit_logs')
        .insert({
          admin_user_id: adminUserId,
          action: newStatus ? 'ACTIVATE_AFFILIATE' : 'DEACTIVATE_AFFILIATE',
          entity_type: 'affiliate',
          entity_id: affiliateId,
          old_data: JSON.stringify({ is_active: affiliate.is_active }),
          new_data: JSON.stringify({ is_active: newStatus })
        });

      if (logError) {
        console.error('Log admin action error:', logError);
      }
    }

    return { 
      success: true, 
      message: `Afiliado ${newStatus ? 'ativado' : 'desativado'} com sucesso`,
      newStatus 
    };
  } catch (error) {
    console.error('Toggle affiliate status error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Delete affiliate
export async function deleteAffiliate(affiliateId: string, adminUserId?: number) {
  try {
    // Get current affiliate
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', affiliateId)
      .single();

    if (affiliateError || !affiliate) {
      return { error: 'Afiliado não encontrado' };
    }

    // Check if affiliate has dependent records
    const { count: hasDownline } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('sponsor_id', affiliateId);

    if (hasDownline && hasDownline > 0) {
      return { 
        error: 'Não é possível excluir afiliado que possui indicados na rede' 
      };
    }

    // Delete affiliate sessions first
    const { error: sessionsError } = await supabase
      .from('affiliate_sessions')
      .delete()
      .eq('affiliate_id', affiliateId);

    if (sessionsError) {
      console.error('Delete affiliate sessions error:', sessionsError);
    }

    // Delete password reset tokens
    const { error: tokensError } = await supabase
      .from('affiliate_password_reset_tokens')
      .delete()
      .eq('affiliate_id', affiliateId);

    if (tokensError) {
      console.error('Delete affiliate tokens error:', tokensError);
    }

    // Update customer_coupons to remove affiliate_id reference
    const { error: couponsError } = await supabase
      .from('customer_coupons')
      .update({ affiliate_id: null })
      .eq('affiliate_id', affiliateId);

    if (couponsError) {
      console.error('Update customer coupons error:', couponsError);
    }

    // Delete affiliate
    const { error: deleteError } = await supabase
      .from('affiliates')
      .delete()
      .eq('id', affiliateId);

    if (deleteError) {
      console.error('Delete affiliate error:', deleteError);
      return { error: 'Erro interno do servidor' };
    }

    // Log action
    if (adminUserId) {
      const { error: logError } = await supabase
        .from('admin_audit_logs')
        .insert({
          admin_user_id: adminUserId,
          action: 'DELETE_AFFILIATE',
          entity_type: 'affiliate',
          entity_id: affiliateId,
          old_data: JSON.stringify(affiliate),
          new_data: JSON.stringify({ deleted: true })
        });

      if (logError) {
        console.error('Log admin action error:', logError);
      }
    }

    return { 
      success: true, 
      message: 'Afiliado excluído com sucesso'
    };
  } catch (error) {
    console.error('Delete affiliate error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Get companies with search and pagination
export async function getCompanies(page = 1, limit = 20, search = '') {
  try {
    const offset = (page - 1) * limit;

    // Build query with search
    let query = supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`nome_fantasia.ilike.%${search}%,razao_social.ilike.%${search}%,cnpj.ilike.%${search}%`);
    }

    // Get total count for pagination
    const { count: totalCount } = await query;

    // Get paginated results
    const { data: companies, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get companies error:', error);
      return { error: 'Erro interno do servidor' };
    }

    // Enhance with additional data
    const enhancedCompanies = [];
    for (const company of companies || []) {
      // Get cashback config
      const { data: cashbackConfig } = await supabase
        .from('company_cashback_config')
        .select('cashback_percentage')
        .eq('company_id', company.id)
        .single();
      
      // Get purchase stats
      const { data: purchaseStats } = await supabase
        .from('company_purchases')
        .select(`
          count(),
          sum(cashback_generated)
        `)
        .eq('company_id', company.id)
        .single();

      enhancedCompanies.push({
        ...company,
        cashback_percentage: cashbackConfig?.cashback_percentage || 5.0,
        total_purchases: purchaseStats?.count || 0,
        total_cashback_generated: purchaseStats?.sum?.cashback_generated || 0
      });
    }

    const totalCountValue = totalCount || 0;

    return {
      companies: enhancedCompanies,
      pagination: {
        page,
        limit,
        total: totalCountValue,
        totalPages: Math.ceil(totalCountValue / limit)
      }
    };
  } catch (error) {
    console.error('Get companies error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Toggle company status
export async function toggleCompanyStatus(companyId: string, adminUserId?: number) {
  try {
    // Get current company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return { error: 'Empresa não encontrada' };
    }

    const newStatus = !company.is_active;

    // Update status
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        is_active: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId);

    if (updateError) {
      console.error('Toggle company status error:', updateError);
      return { error: 'Erro interno do servidor' };
    }

    // Log action
    if (adminUserId) {
      const { error: logError } = await supabase
        .from('admin_audit_logs')
        .insert({
          admin_user_id: adminUserId,
          action: newStatus ? 'ACTIVATE_COMPANY' : 'DEACTIVATE_COMPANY',
          entity_type: 'company',
          entity_id: companyId,
          old_data: JSON.stringify({ is_active: company.is_active }),
          new_data: JSON.stringify({ is_active: newStatus })
        });

      if (logError) {
        console.error('Log admin action error:', logError);
      }
    }

    return { 
      success: true, 
      message: `Empresa ${newStatus ? 'ativada' : 'desativada'} com sucesso`,
      newStatus 
    };
  } catch (error) {
    console.error('Toggle company status error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Get commission settings
export async function getCommissionSettings() {
  try {
    const { data: settings, error } = await supabase
      .from('system_commission_settings')
      .select('level, percentage, is_active')
      .order('level', { ascending: true });

    if (error) {
      console.error('Get commission settings error:', error);
      return { error: 'Erro interno do servidor' };
    }

    return { settings: settings || [] };
  } catch (error) {
    console.error('Get commission settings error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Update commission settings
export async function updateCommissionSettings(settings: Array<{ level: number; percentage: number }>, adminUserId?: number) {
  try {
    // Validate that percentages sum to 100%
    const total = settings.reduce((sum, s) => sum + s.percentage, 0);
    if (Math.abs(total - 100.0) > 0.01) {
      return { 
        error: 'A soma dos percentuais deve ser 100%' 
      };
    }

    // Validate settings structure
    if (!validateCommissionSettings(settings)) {
      return { 
        error: 'Configurações de comissão inválidas' 
      };
    }

    // Update each level
    for (const setting of settings) {
      const { error: updateError } = await supabase
        .from('system_commission_settings')
        .update({
          percentage: setting.percentage,
          updated_at: new Date().toISOString()
        })
        .eq('level', setting.level);

      if (updateError) {
        console.error('Update commission setting error:', updateError);
        return { error: 'Erro interno do servidor' };
      }
    }

    // Log action
    if (adminUserId) {
      const { error: logError } = await supabase
        .from('admin_audit_logs')
        .insert({
          admin_user_id: adminUserId,
          action: 'UPDATE_COMMISSION_SETTINGS',
          entity_type: 'system_settings',
          entity_id: 0,
          new_data: JSON.stringify(settings)
        });

      if (logError) {
        console.error('Log admin action error:', logError);
      }
    }

    return { 
      success: true, 
      message: 'Configurações de comissão atualizadas com sucesso' 
    };
  } catch (error) {
    console.error('Update commission settings error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

/**
 * Validate commission settings to ensure they sum to 100%
 */
function validateCommissionSettings(settings: Array<{ level: number; percentage: number }>): boolean {
  const total = settings.reduce((sum, s) => sum + s.percentage, 0);
  // Allow small floating point tolerance
  return Math.abs(total - 100.0) < 0.01;
}