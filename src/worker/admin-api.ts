import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { createClient } from '@supabase/supabase-js'
import { z } from "zod";
import { validateCommissionSettings } from "./commission-utils";

const adminApi = new Hono<{ Bindings: Env }>();

function createSupabaseClient(c: any) {
  const url = (c?.env?.SUPABASE_URL) || (process?.env?.SUPABASE_URL as string) || '';
  const key = (c?.env?.SUPABASE_SERVICE_ROLE_KEY) || (process?.env?.SUPABASE_SERVICE_ROLE_KEY as string) || '';
  return createClient(url, key);
}

// Middleware para verificar autenticação admin
async function requireAdminAuth(c: any, next: any) {
  const cookieToken = getCookie(c, "admin_session");
  const headerAdminToken = c.req.header('x-admin-token') || '';
  const xSession = c.req.header('x-session-token') || '';
  const authHeader = c.req.header('authorization') || '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const sessionToken = headerAdminToken || xSession || bearer || cookieToken || '';
  const allCookies = c.req.header('cookie') || '';
  const requestUrl = c.req.url;
  const userAgent = c.req.header('user-agent') || '';
  
  console.log('[ADMIN_AUTH_MIDDLEWARE] Detailed auth check:', {
    url: requestUrl,
    hasToken: !!sessionToken,
    tokenPreview: sessionToken ? sessionToken.substring(0, 10) + '...' : 'none',
    allCookiesPresent: !!allCookies,
    cookiesContainAdminSession: allCookies.includes('admin_session'),
    fullCookieHeader: allCookies,
    userAgent: userAgent.substring(0, 50) + '...',
    headers: {
      origin: c.req.header('origin'),
      referer: c.req.header('referer'),
      host: c.req.header('host')
    }
  });
  
  if (!sessionToken) {
    console.log('[ADMIN_AUTH_MIDDLEWARE] No admin_session cookie found');
    console.log('[ADMIN_AUTH_MIDDLEWARE] Available cookies:', allCookies);
    return c.json({ error: "Não autenticado", debug_header_admin: headerAdminToken, debug_x_session: xSession }, 401);
  }

  try {
    const supabase = createSupabaseClient(c);
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('admin_user_id, admin_users!inner(username, full_name, is_active)')
      .eq('session_token', String(sessionToken))
      .maybeSingle();

    if (!session) {
      console.log('[ADMIN_AUTH_MIDDLEWARE] Invalid or expired session');
      return c.json({ error: "Sessão inválida", debug_token_recebido: sessionToken, debug_header_admin: headerAdminToken }, 401);
    }

    console.log('[ADMIN_AUTH_MIDDLEWARE] Valid session found for user:', (session as any).admin_users.username);
    (c as any).set("adminUser", session);
    await next();
  } catch (error) {
    console.error('[ADMIN_AUTH_MIDDLEWARE] Database error:', error);
    return c.json({ error: "Erro de autenticação" }, 500);
  }
}

// Get current admin user
adminApi.get("/api/admin/me", requireAdminAuth, async (c) => {
  try {
    const adminUser: any = (c as any).get("adminUser");
    const supabase = createSupabaseClient(c);
    const tokenUsed =
      c.req.header('x-admin-token') ||
      c.req.header('x-session-token') ||
      (c.req.header('authorization') || '').replace(/^Bearer\s+/i, '') ||
      getCookie(c, "admin_session") ||
      '';
    console.log('[ADMIN_ME] Buscando no banco o token exato:', tokenUsed);
    const { data: sessionRow } = await supabase
      .from('admin_sessions')
      .select('*, admin_users(*)')
      .eq('session_token', String(tokenUsed))
      .maybeSingle();
    if (!sessionRow) {
      console.log('[ADMIN_ME] Session not found for token');
      return c.json({ error: 'Sessão inválida', debug_token_recebido: tokenUsed, debug_header_admin: c.req.header('x-admin-token') }, 401);
    }
    const { data: fullAdminData, error } = await supabase
      .from('admin_users')
      .select('id, username, email, full_name, is_active, last_login_at, created_at')
      .eq('id', (sessionRow as any).admin_user_id)
      .single();
    if (error || !fullAdminData) {
      return c.json({ error: "Usuário não encontrado" }, 404);
    }
    return c.json({ admin: fullAdminData });
  } catch (error) {
    console.error("Get admin user error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Dashboard stats
adminApi.get("/api/admin/dashboard/stats", requireAdminAuth, async (c) => {
  try {
    const supabase = createSupabaseClient(c);
    const { count: totalAffiliates } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: totalCompanies } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { data: pendingWithdrawals } = await supabase
      .from('withdrawals')
      .select('amount_requested')
      .eq('status', 'pending');
    const pendingCount = (pendingWithdrawals || []).length;
    const pendingAmount = (pendingWithdrawals || []).reduce((sum: number, w: any) => sum + Number(w.amount_requested || 0), 0);

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];
    const { data: monthRows } = await supabase
      .from('company_purchases')
      .select('cashback_generated, purchase_date')
      .gte('purchase_date', monthStart)
      .lt('purchase_date', nextMonthStart);
    const cashbackThisMonth = (monthRows || []).reduce((sum: number, r: any) => sum + Number(r.cashback_generated || 0), 0);

    const { data: recent } = await supabase
      .from('company_purchases')
      .select('id, company_id, purchase_value, cashback_generated, purchase_date, customer_coupon')
      .order('created_at', { ascending: false })
      .limit(10);
    const enhancedPurchases = [] as any[];
    for (const p of recent || []) {
      let companyName = 'Empresa Desconhecida';
      const { data: company } = await supabase
        .from('companies')
        .select('nome_fantasia')
        .eq('id', p.company_id)
        .single();
      if (company) companyName = (company as any).nome_fantasia || companyName;
      enhancedPurchases.push({
        id: p.id,
        company_name: companyName,
        customer_cpf: p.customer_coupon,
        purchase_value: p.purchase_value,
        cashback_generated: p.cashback_generated,
        purchase_date: p.purchase_date
      });
    }

    return c.json({
      stats: {
        totalAffiliates,
        totalCompanies,
        pendingWithdrawals: {
          count: pendingCount,
          totalAmount: pendingAmount
        },
        cashbackThisMonth
      },
      recentPurchases: enhancedPurchases
    });

  } catch (error) {
    console.error("Admin dashboard stats error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Dashboard charts data - FIXED: Simplified for Cloudflare D1
adminApi.get("/api/admin/dashboard/charts", requireAdminAuth, async (c) => {
  try {
    const supabase = createSupabaseClient(c);
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    const startStr = start.toISOString().split('T')[0];
    const { data: purchases } = await supabase
      .from('company_purchases')
      .select('purchase_date, cashback_generated, company_id')
      .gte('purchase_date', startStr);
    const { data: affiliates } = await supabase
      .from('affiliates')
      .select('created_at')
      .gte('created_at', startStr);

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyStatsMap = new Map<string, { month: string; purchases: number; cashback: number; companies: number; affiliates: number }>();
    const companiesPerMonth = new Map<string, Set<number>>();
    for (const p of purchases || []) {
      const key = String(p.purchase_date).slice(0, 7);
      const monthNum = parseInt(key.split('-')[1]);
      const current = monthlyStatsMap.get(key) || { month: monthNames[monthNum - 1], purchases: 0, cashback: 0, companies: 0, affiliates: 0 };
      current.purchases += 1;
      current.cashback += Number(p.cashback_generated || 0);
      monthlyStatsMap.set(key, current);
      const set = companiesPerMonth.get(key) || new Set<number>();
      set.add(p.company_id as number);
      companiesPerMonth.set(key, set);
    }
    for (const [key, set] of companiesPerMonth.entries()) {
      const curr = monthlyStatsMap.get(key);
      if (curr) curr.companies = set.size;
    }
    for (const a of affiliates || []) {
      const key = String(a.created_at).slice(0, 7);
      const curr = monthlyStatsMap.get(key);
      if (curr) curr.affiliates += 1;
    }
    const formattedMonthlyStats = Array.from(monthlyStatsMap.values());

    const { count: totalAff } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    const { count: totalComp } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    const { data: pendWd } = await supabase
      .from('withdrawals')
      .select('status')
      .eq('status', 'pending');

    const statusDistribution = [
      { name: 'Afiliados Ativos', value: totalAff || 0, color: '#10b981' },
      { name: 'Empresas Ativas', value: totalComp || 0, color: '#3b82f6' },
      { name: 'Saques Pendentes', value: (pendWd || []).length, color: '#f59e0b' }
    ];

    const weeklyGrowthData = [] as any[];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const nextDayStr = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString().split('T')[0];
      const { count: affCount } = await supabase
        .from('affiliates')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dayStr)
        .lt('created_at', nextDayStr);
      const { count: compCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dayStr)
        .lt('created_at', nextDayStr);
      const { count: purchCount } = await supabase
        .from('company_purchases')
        .select('*', { count: 'exact', head: true })
        .eq('purchase_date', dayStr);
      weeklyGrowthData.push({
        day: dayNames[d.getDay()],
        newAffiliates: affCount || 0,
        newCompanies: compCount || 0,
        totalPurchases: purchCount || 0
      });
    }

    return c.json({
      monthlyStats: formattedMonthlyStats,
      statusDistribution,
      weeklyGrowth: weeklyGrowthData
    });

  } catch (error) {
    console.error("Admin dashboard charts error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Withdrawals management
adminApi.get("/api/admin/withdrawals", requireAdminAuth, async (c) => {
  try {
    const status = c.req.query("status") || "pending";
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = (page - 1) * limit;
    const supabase = createSupabaseClient(c);

    let query = supabase
      .from('withdrawals')
      .select('id, amount_requested, fee_amount, net_amount, status, pix_key, created_at, affiliate_id, affiliates!inner(full_name,cpf,email)', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false });

    const { data: rows, error: listError, count: totalCountValue } = await query.range(offset, offset + limit - 1);
    if (listError) {
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }

    const enhancedWithdrawals = (rows || []).map((w: any) => ({
      id: w.id,
      amount_requested: Number(w.amount_requested || 0),
      fee_amount: Number(w.fee_amount || 0),
      net_amount: Number(w.net_amount || 0),
      status: w.status,
      pix_key: w.pix_key || '',
      created_at: w.created_at,
      full_name: w.affiliates?.full_name || 'N/A',
      cpf: w.affiliates?.cpf || 'N/A',
      email: w.affiliates?.email || 'N/A'
    }));

    return c.json({
      withdrawals: enhancedWithdrawals,
      pagination: {
        page,
        limit,
        total: totalCountValue || 0,
        totalPages: Math.ceil((totalCountValue || 0) / limit)
      }
    });

  } catch (error) {
    console.error("Get withdrawals error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Update withdrawal status
const UpdateWithdrawalSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  notes: z.string().optional()
});

adminApi.patch("/api/admin/withdrawals/:id", requireAdminAuth, async (c) => {
  try {
    const withdrawalId = Number(c.req.param("id"));
    const body = await c.req.json();
    const validation = UpdateWithdrawalSchema.safeParse(body);
    if (!validation.success) {
      return c.json({ error: "Dados inválidos", details: validation.error.errors }, 400);
    }
    const { status, notes } = validation.data;
    const adminUser: any = (c as any).get("adminUser");
    const supabase = createSupabaseClient(c);

    const { data: withdrawal } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .single();
    if (!withdrawal) {
      return c.json({ error: "Saque não encontrado" }, 404);
    }
    if ((withdrawal as any).status !== 'pending') {
      return c.json({ error: "Saque já foi processado" }, 400);
    }

    const { error: updateError } = await supabase
      .from('withdrawals')
      .update({ status, processed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', withdrawalId);
    if (updateError) {
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }

    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: (adminUser as any).admin_user_id,
        action: status === 'approved' ? 'APPROVE_WITHDRAWAL' : 'REJECT_WITHDRAWAL',
        entity_type: 'withdrawal',
        entity_id: withdrawalId,
        old_data: JSON.stringify({ status: (withdrawal as any).status }),
        new_data: JSON.stringify({ status, notes })
      });

    return c.json({ success: true, message: `Saque ${status === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso` });
  } catch (error) {
    console.error("Update withdrawal error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

adminApi.get("/api/admin/reports/companies", requireAdminAuth, async (c) => {
  try {
    const supabase = createSupabaseClient(c);
    const { data, error } = await supabase
      .from('companies')
      .select('id,nome_fantasia')
      .order('nome_fantasia', { ascending: true });
    if (error) {
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }
    return c.json({ companies: data || [] });
  } catch (error) {
    console.error('Get report companies error:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

adminApi.get("/api/admin/reports/purchases", requireAdminAuth, async (c) => {
  try {
    const companyId = c.req.query('companyId');
    const range = c.req.query('range') || '7';
    const start = c.req.query('start');
    const end = c.req.query('end');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    const supabase = createSupabaseClient(c);

    let fromDate: string | null = null;
    let toDate: string | null = null;
    const today = new Date();
    const dateISO = (d: Date) => d.toISOString().split('T')[0];

    if (range === 'today') {
      fromDate = dateISO(today);
      toDate = dateISO(today);
    } else if (range === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      fromDate = dateISO(y);
      toDate = dateISO(y);
    } else if (range === '7' || range === '15' || range === '30') {
      const days = parseInt(range);
      const startD = new Date(today);
      startD.setDate(startD.getDate() - days + 1);
      fromDate = dateISO(startD);
      toDate = dateISO(today);
    } else if (range === 'custom' && start && end) {
      fromDate = start;
      toDate = end;
    }

    let query = supabase
      .from('company_purchases')
      .select('id, company_id, purchase_value, cashback_generated, purchase_date, customer_coupon, companies!inner(nome_fantasia)', { count: 'exact' })
      .order('purchase_date', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', Number(companyId));
    }
    if (fromDate) {
      query = query.gte('purchase_date', fromDate);
    }
    if (toDate) {
      query = query.lte('purchase_date', toDate);
    }

    const { data: rows, error: listError, count } = await query.range(offset, offset + limit - 1);
    if (listError) {
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }

    let sumQuery = supabase
      .from('company_purchases')
      .select('sum(purchase_value), sum(cashback_generated)')
      .order('purchase_date', { ascending: false });
    if (companyId) {
      sumQuery = sumQuery.eq('company_id', Number(companyId));
    }
    if (fromDate) {
      sumQuery = sumQuery.gte('purchase_date', fromDate);
    }
    if (toDate) {
      sumQuery = sumQuery.lte('purchase_date', toDate);
    }
    const { data: sumRow } = await sumQuery.single();

    return c.json({
      purchases: rows || [],
      totals: {
        total_purchase_value: (sumRow as any)?.sum?.purchase_value || 0,
        total_cashback_generated: (sumRow as any)?.sum?.cashback_generated || 0
      },
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Get report purchases error:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Get global affiliates statistics
adminApi.get("/api/admin/affiliates/stats", requireAdminAuth, async (c) => {
  try {
    const supabase = createSupabaseClient(c);
    const { count: totalActive } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    const { count: totalInactive } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false);
    const { data: cbRows } = await supabase
      .from('company_purchases')
      .select('cashback_generated');
    const totalCashbackGenerated = (cbRows || []).reduce((sum: number, r: any) => sum + Number(r.cashback_generated || 0), 0);
    const totalCommissionsPending = totalCashbackGenerated * 0.70;
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];
    const { count: newAffiliatesThisMonth } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart)
      .lt('created_at', nextMonthStart);

    return c.json({
      totalActive,
      totalInactive,
      totalCashbackGenerated,
      totalCommissionsPending,
      newAffiliatesThisMonth
    });

  } catch (error) {
    console.error("Get affiliates stats error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Affiliates management - FIXED: Simplified queries
adminApi.get("/api/admin/affiliates", requireAdminAuth, async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const search = c.req.query("search") || "";
    const offset = (page - 1) * limit;
    const supabase = createSupabaseClient(c);
    let query = supabase
      .from('affiliates')
      .select('id, full_name, email, cpf, phone, referral_code, sponsor_id, is_active, is_verified, created_at, last_access_at', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (search) {
      const term = `%${search}%`;
      query = query.or(`full_name.ilike.${term},email.ilike.${term},cpf.ilike.${term}`);
    }
    const { data: rows, count: totalCountValue } = await query.range(offset, offset + limit - 1);
    const affiliates = rows || [];
    const enrichedAffiliates = [] as any[];
    for (const a of affiliates) {
      const { count: directReferrals } = await supabase
        .from('affiliates')
        .select('*', { count: 'exact', head: true })
        .eq('sponsor_id', (a as any).id);
      let totalCashback = 0;
      if ((a as any).cpf) {
        const { data: cbRows } = await supabase
          .from('company_purchases')
          .select('cashback_generated')
          .eq('customer_coupon', (a as any).cpf);
        totalCashback = (cbRows || []).reduce((sum: number, r: any) => sum + Number(r.cashback_generated || 0), 0);
      }
      enrichedAffiliates.push({
        id: (a as any).id,
        full_name: (a as any).full_name,
        email: (a as any).email,
        cpf: (a as any).cpf,
        whatsapp: (a as any).phone || null,
        referral_code: (a as any).referral_code,
        sponsor_id: (a as any).sponsor_id,
        is_active: Boolean((a as any).is_active),
        is_verified: Boolean((a as any).is_verified),
        created_at: (a as any).created_at,
        last_access_at: (a as any).last_access_at || null,
        direct_referrals: directReferrals || 0,
        total_cashback: totalCashback,
        pending_commissions: totalCashback * 0.7
      });
    }
    return c.json({
      affiliates: enrichedAffiliates,
      pagination: {
        page,
        limit,
        total: totalCountValue || 0,
        totalPages: Math.ceil((totalCountValue || 0) / limit)
      }
    });

  } catch (error) {
    console.error("[ADMIN_API] Get affiliates error:", error);
    return c.json({ 
      error: "Erro ao buscar afiliados",
      affiliates: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    }, 500);
  }
});

// Update affiliate details
const UpdateAffiliateSchema = z.object({
  full_name: z.string().min(1, "Nome completo é obrigatório"),
  email: z.string().email("Email inválido"),
  whatsapp: z.string().optional()
});

adminApi.patch("/api/admin/affiliates/:id", requireAdminAuth, async (c) => {
  try {
    const affiliateId = c.req.param("id");
    const body = await c.req.json();
    const validation = UpdateAffiliateSchema.safeParse(body);
    
    if (!validation.success) {
      return c.json({ 
        error: "Dados inválidos", 
        details: validation.error.errors 
      }, 400);
    }

    const { full_name, email, whatsapp } = validation.data;
    const adminUser: any = (c as any).get("adminUser");
    const supabase = createSupabaseClient(c);
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', Number(affiliateId))
      .single();

    if (!affiliate) {
      return c.json({ error: "Afiliado não encontrado" }, 404);
    }

    // Check if email is already in use by another affiliate
    const { data: emailCheck } = await supabase
      .from('affiliates')
      .select('id')
      .eq('email', email)
      .neq('id', Number(affiliateId))
      .single();

    if (emailCheck) {
      return c.json({ error: "Email já está em uso por outro afiliado" }, 409);
    }

    // Update affiliate
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({ full_name, email, phone: whatsapp || null, updated_at: new Date().toISOString() })
      .eq('id', Number(affiliateId));
    if (updateError) {
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }

    // Log action
    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: (adminUser as any).admin_user_id,
        action: 'UPDATE_AFFILIATE',
        entity_type: 'affiliate',
        entity_id: Number(affiliateId)
      });

    return c.json({ 
      success: true, 
      message: "Afiliado atualizado com sucesso"
    });

  } catch (error) {
    console.error("Update affiliate error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Toggle affiliate status
adminApi.patch("/api/admin/affiliates/:id/toggle-status", requireAdminAuth, async (c) => {
  try {
    const affiliateId = c.req.param("id");
    const adminUser: any = (c as any).get("adminUser");
    const supabase = createSupabaseClient(c);
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', Number(affiliateId))
      .single();

    if (!affiliate) {
      return c.json({ error: "Afiliado não encontrado" }, 404);
    }

    const newStatus = !affiliate.is_active;

    const { error: updateError } = await supabase
      .from('affiliates')
      .update({ is_active: newStatus, updated_at: new Date().toISOString() })
      .eq('id', Number(affiliateId));
    if (updateError) {
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }

    // Log action
    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: (adminUser as any).admin_user_id,
        action: newStatus ? 'ACTIVATE_AFFILIATE' : 'DEACTIVATE_AFFILIATE',
        entity_type: 'affiliate',
        entity_id: Number(affiliateId)
      });

    return c.json({ 
      success: true, 
      message: `Afiliado ${newStatus ? "ativado" : "desativado"} com sucesso`,
      newStatus 
    });

  } catch (error) {
    console.error("Toggle affiliate status error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Delete affiliate
adminApi.delete("/api/admin/affiliates/:id", requireAdminAuth, async (c) => {
  try {
    const affiliateId = c.req.param("id");
    const adminUser: any = (c as any).get("adminUser");
    const supabase = createSupabaseClient(c);
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', Number(affiliateId))
      .single();

    if (!affiliate) {
      return c.json({ error: "Afiliado não encontrado" }, 404);
    }

    // Check if affiliate has dependent records
    const { count: downline } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('sponsor_id', Number(affiliateId));

    if ((downline || 0) > 0) {
      return c.json({ 
        error: "Não é possível excluir afiliado que possui indicados na rede" 
      }, 400);
    }

    await supabase
      .from('affiliate_sessions')
      .delete()
      .eq('affiliate_id', Number(affiliateId));

    await supabase
      .from('affiliate_password_reset_tokens')
      .delete()
      .eq('affiliate_id', Number(affiliateId));

    await supabase
      .from('customer_coupons')
      .update({ affiliate_id: null })
      .eq('affiliate_id', Number(affiliateId));

    await supabase
      .from('affiliates')
      .delete()
      .eq('id', Number(affiliateId));

    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: (adminUser as any).admin_user_id,
        action: 'DELETE_AFFILIATE',
        entity_type: 'affiliate',
        entity_id: Number(affiliateId)
      });

    return c.json({ 
      success: true, 
      message: "Afiliado excluído com sucesso"
    });

  } catch (error) {
    console.error("Delete affiliate error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Companies management - FIXED: Simplified queries
adminApi.get("/api/admin/companies", requireAdminAuth, async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const search = c.req.query("search") || "";
    const offset = (page - 1) * limit;

    const supabase = createSupabaseClient(c);

    let select = supabase
      .from('companies')
      .select('id,nome_fantasia,razao_social,cnpj,email,telefone,responsavel,is_active,created_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      select = select.or(`nome_fantasia.ilike.%${search}%,razao_social.ilike.%${search}%,cnpj.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: companies, error: listError, count } = await select.range(offset, offset + limit - 1);
    if (listError) {
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }

    const enhancedCompanies: Array<any> = [];
    for (const company of companies || []) {
      const companyId = (company as any).id;

      const { data: cashbackConfig } = await supabase
        .from('company_cashback_config')
        .select('cashback_percentage')
        .eq('company_id', companyId)
        .single();

      const { count: totalPurchases } = await supabase
        .from('company_purchases')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId);

      const { data: sumRow } = await supabase
        .from('company_purchases')
        .select('sum(cashback_generated)')
        .eq('company_id', companyId)
        .single();

      enhancedCompanies.push({
        ...company,
        cashback_percentage: (cashbackConfig as any)?.cashback_percentage ?? 5.0,
        total_purchases: totalPurchases || 0,
        total_cashback_generated: (sumRow as any)?.sum ?? 0
      });
    }

    const total = count || 0;

    return c.json({
      companies: enhancedCompanies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Get companies error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

adminApi.get("/api/admin/companies/:id", requireAdminAuth, async (c) => {
  try {
    const companyId = Number(c.req.param("id"));
    const supabase = createSupabaseClient(c);

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id,nome_fantasia,razao_social,cnpj,email,telefone,responsavel,is_active,created_at')
      .eq('id', companyId)
      .single();
    if (companyError || !company) {
      return c.json({ error: 'Empresa não encontrada' }, 404);
    }

    const { data: cashbackConfig } = await supabase
      .from('company_cashback_config')
      .select('cashback_percentage')
      .eq('company_id', companyId)
      .single();

    const { count: totalPurchases } = await supabase
      .from('company_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const { data: sumRow } = await supabase
      .from('company_purchases')
      .select('sum(cashback_generated), sum(purchase_value)')
      .eq('company_id', companyId)
      .single();

    const { data: recentPurchases } = await supabase
      .from('company_purchases')
      .select('id,purchase_value,cashback_generated,purchase_date,customer_coupon')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(5);

    return c.json({
      company,
      metrics: {
        cashback_percentage: (cashbackConfig as any)?.cashback_percentage ?? 5.0,
        total_purchases: totalPurchases || 0,
        total_cashback_generated: (sumRow as any)?.sum ?? 0,
        total_purchase_value: (sumRow as any)?.sum ?? 0
      },
      recentPurchases: recentPurchases || []
    });
  } catch (error) {
    console.error('Get company details error:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Toggle company status (Supabase)
adminApi.patch("/api/admin/companies/:id/toggle-status", requireAdminAuth, async (c) => {
  try {
    const companyId = c.req.param("id");
    const adminUser: any = (c as any).get("adminUser");
    const supabase = createSupabaseClient(c);
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', Number(companyId))
      .single();

    if (!company) {
      return c.json({ error: "Empresa não encontrada" }, 404);
    }

    const newStatus = !Boolean((company as any).is_active);
    const { error: updateError } = await supabase
      .from('companies')
      .update({ is_active: newStatus, updated_at: new Date().toISOString() })
      .eq('id', Number(companyId));
    if (updateError) {
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }

    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: (adminUser as any).admin_user_id,
        action: newStatus ? 'ACTIVATE_COMPANY' : 'DEACTIVATE_COMPANY',
        entity_type: 'company',
        entity_id: Number(companyId)
      });

    return c.json({ 
      success: true, 
      message: `Empresa ${newStatus ? "ativada" : "desativada"} com sucesso`,
      newStatus 
    });

  } catch (error) {
    console.error("Toggle company status error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Get commission settings
adminApi.get("/api/admin/commission-settings", requireAdminAuth, async (c) => {
  try {
    const supabase = createSupabaseClient(c);
    const { data: settings, error } = await supabase
      .from('system_commission_settings')
      .select('level, percentage, is_active')
      .order('level', { ascending: true });
    if (error) {
      return c.json({ error: "Erro interno do servidor" }, 500);
    }
    return c.json({ settings: settings || [] });
  } catch (error) {
    console.error("Get commission settings error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Update commission settings
const UpdateCommissionSettingsSchema = z.object({
  settings: z.array(z.object({
    level: z.number().min(1).max(10),
    percentage: z.number().min(0).max(100)
  }))
});

adminApi.put("/api/admin/commission-settings", requireAdminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const validation = UpdateCommissionSettingsSchema.safeParse(body);
    
    if (!validation.success) {
      return c.json({ 
        error: "Dados inválidos", 
        details: validation.error.errors 
      }, 400);
    }

    const { settings } = validation.data;
    const adminUser: any = (c as any).get("adminUser");

    // Validate that percentages sum to 100%
    const total = settings.reduce((sum, s) => sum + s.percentage, 0);
    if (Math.abs(total - 100.0) > 0.01) {
      return c.json({ 
        error: "A soma dos percentuais deve ser 100%" 
      }, 400);
    }

    // Validate settings structure
    if (!validateCommissionSettings(settings)) {
      return c.json({ 
        error: "Configurações de comissão inválidas" 
      }, 400);
    }

    const supabase = createSupabaseClient(c);
    for (const setting of settings) {
      await supabase
        .from('system_commission_settings')
        .update({ percentage: setting.percentage, updated_at: new Date().toISOString() })
        .eq('level', setting.level);
    }
    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: (adminUser as any).admin_user_id,
        action: 'UPDATE_COMMISSION_SETTINGS',
        entity_type: 'system_settings',
        entity_id: 0,
        new_data: JSON.stringify(settings)
      });
    return c.json({ success: true, message: "Configurações de comissão atualizadas com sucesso" });

  } catch (error) {
    console.error("Update commission settings error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

export default adminApi;
