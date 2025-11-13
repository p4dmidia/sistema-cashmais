import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { z } from "zod";
import { validateCommissionSettings } from "./commission-utils";

const adminApi = new Hono<{ Bindings: Env }>();

// Middleware para verificar autenticação admin
async function requireAdminAuth(c: any, next: any) {
  const sessionToken = getCookie(c, "admin_session");
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
    return c.json({ error: "Não autenticado" }, 401);
  }

  try {
    const session = await c.env.DB.prepare(`
      SELECT s.admin_user_id, u.username, u.full_name
      FROM admin_sessions s
      JOIN admin_users u ON s.admin_user_id = u.id
      WHERE s.session_token = ? AND s.expires_at > datetime('now') AND u.is_active = 1
    `).bind(sessionToken).first();

    if (!session) {
      console.log('[ADMIN_AUTH_MIDDLEWARE] Invalid or expired session');
      return c.json({ error: "Sessão inválida" }, 401);
    }

    console.log('[ADMIN_AUTH_MIDDLEWARE] Valid session found for user:', session.username);
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
    
    const fullAdminData = await c.env.DB.prepare(
      "SELECT id, username, email, full_name, is_active, last_login_at, created_at FROM admin_users WHERE id = ?"
    ).bind(adminUser.admin_user_id).first();

    if (!fullAdminData) {
      return c.json({ error: "Usuário não encontrado" }, 404);
    }

    return c.json({
      admin: fullAdminData
    });
  } catch (error) {
    console.error("Get admin user error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Dashboard stats
adminApi.get("/api/admin/dashboard/stats", requireAdminAuth, async (c) => {
  try {
    // Total affiliates (all active)
    const totalAffiliatesResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM affiliates WHERE is_active = 1"
    ).first();
    const totalAffiliates = (totalAffiliatesResult?.count as number) || 0;

    // Total active companies
    const totalCompaniesResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM companies WHERE is_active = 1"
    ).first();
    const totalCompanies = (totalCompaniesResult?.count as number) || 0;

    // Pending withdrawals - count and total amount
    const pendingWithdrawalsResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as count, COALESCE(SUM(amount_requested), 0) as total_amount FROM withdrawals WHERE status = 'pending'"
    ).first();
    const pendingCount = (pendingWithdrawalsResult?.count as number) || 0;
    const pendingAmount = (pendingWithdrawalsResult?.total_amount as number) || 0;

    // Get current month in format YYYY-MM
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const thisMonth = `${year}-${month}`;

    // Total cashback generated this month
    const cashbackThisMonthResult = await c.env.DB.prepare(
      "SELECT COALESCE(SUM(cashback_generated), 0) as total FROM company_purchases WHERE strftime('%Y-%m', purchase_date) = ?"
    ).bind(thisMonth).first();
    const cashbackThisMonth = (cashbackThisMonthResult?.total as number) || 0;

    // Recent purchases (last 10) with simplified query
    const recentPurchasesResult = await c.env.DB.prepare(`
      SELECT 
        cp.id,
        cp.purchase_value,
        cp.cashback_generated,
        cp.purchase_date,
        cp.customer_coupon as customer_cpf
      FROM company_purchases cp
      ORDER BY cp.created_at DESC
      LIMIT 10
    `).all();

    // Enhance with company names separately
    const enhancedPurchases = [];
    for (const purchase of recentPurchasesResult.results as any[]) {
      // Get company name
      const company = await c.env.DB.prepare(
        "SELECT nome_fantasia FROM companies WHERE id = (SELECT company_id FROM company_purchases WHERE id = ?)"
      ).bind(purchase.id).first();
      
      enhancedPurchases.push({
        ...purchase,
        company_name: company?.nome_fantasia || 'Empresa Desconhecida'
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
    // Get monthly purchase data separately (simplified query)
    const monthlyPurchaseData = await c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m', purchase_date) as month_key,
        strftime('%m', purchase_date) as month_num,
        COUNT(id) as purchases,
        COALESCE(SUM(cashback_generated), 0) as cashback,
        COUNT(DISTINCT company_id) as companies
      FROM company_purchases
      WHERE purchase_date >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', purchase_date)
      ORDER BY month_key ASC
      LIMIT 6
    `).all();

    // Get affiliate signup data separately 
    const monthlyAffiliateData = await c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month_key,
        COUNT(id) as affiliates
      FROM affiliates
      WHERE created_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month_key ASC
    `).all();

    // Merge the data
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyStatsMap = new Map();
    
    // Initialize with purchase data
    for (const row of monthlyPurchaseData.results as any[]) {
      monthlyStatsMap.set(row.month_key, {
        month: monthNames[parseInt(row.month_num) - 1],
        purchases: row.purchases,
        cashback: row.cashback,
        companies: row.companies,
        affiliates: 0 // default
      });
    }
    
    // Add affiliate data
    for (const row of monthlyAffiliateData.results as any[]) {
      const existing = monthlyStatsMap.get(row.month_key);
      if (existing) {
        existing.affiliates = row.affiliates;
      }
    }

    const formattedMonthlyStats = Array.from(monthlyStatsMap.values());

    // Get current counts for status distribution
    const totalAffiliates = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM affiliates WHERE is_active = 1"
    ).first();
    
    const totalCompanies = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM companies WHERE is_active = 1"
    ).first();
    
    const pendingWithdrawals = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM withdrawals WHERE status = 'pending'"
    ).first();

    const statusDistribution = [
      { 
        name: 'Afiliados Ativos', 
        value: (totalAffiliates?.count as number) || 0, 
        color: '#10b981' 
      },
      { 
        name: 'Empresas Ativas', 
        value: (totalCompanies?.count as number) || 0, 
        color: '#3b82f6' 
      },
      { 
        name: 'Saques Pendentes', 
        value: (pendingWithdrawals?.count as number) || 0, 
        color: '#f59e0b' 
      }
    ];

    // Weekly growth data (simplified) - get data for last 7 days
    const weeklyGrowthData = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    for (let i = 6; i >= 0; i--) {
      // Get day info
      const dateStr = `date('now', '-${i} days')`;
      
      // Get affiliate signups for this day
      const affiliateCount = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM affiliates WHERE date(created_at) = ${dateStr}
      `).first();
      
      // Get company signups for this day
      const companyCount = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM companies WHERE date(created_at) = ${dateStr}
      `).first();
      
      // Get purchases for this day
      const purchaseCount = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM company_purchases WHERE purchase_date = ${dateStr}
      `).first();

      // Get day name
      const dayNum = await c.env.DB.prepare(`
        SELECT strftime('%w', ${dateStr}) as day_num
      `).first();
      
      weeklyGrowthData.push({
        day: dayNames[parseInt((dayNum as any)?.day_num || '0')],
        newAffiliates: (affiliateCount?.count as number) || 0,
        newCompanies: (companyCount?.count as number) || 0,
        totalPurchases: (purchaseCount?.count as number) || 0
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

    const withdrawals = await c.env.DB.prepare(`
      SELECT w.*, up.mocha_user_id
      FROM withdrawals w
      JOIN user_profiles up ON w.user_id = up.id
      WHERE w.status = ?
      ORDER BY w.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(status, limit, offset).all();

    // Enhance with affiliate info separately to avoid complex JOINs
    const enhancedWithdrawals = [];
    for (const withdrawal of withdrawals.results as any[]) {
      // Extract affiliate ID from mocha_user_id (format: affiliate_123)
      const affiliateId = withdrawal.mocha_user_id?.replace('affiliate_', '');
      if (affiliateId && !isNaN(parseInt(affiliateId))) {
        const affiliate = await c.env.DB.prepare(
          "SELECT full_name, cpf, email FROM affiliates WHERE id = ?"
        ).bind(parseInt(affiliateId)).first();
        
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

    const totalCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM withdrawals WHERE status = ?"
    ).bind(status).first();

    const totalCountValue = (totalCount?.count as number) || 0;

    return c.json({
      withdrawals: enhancedWithdrawals,
      pagination: {
        page,
        limit,
        total: totalCountValue,
        totalPages: Math.ceil(totalCountValue / limit)
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
    const withdrawalId = c.req.param("id");
    const body = await c.req.json();
    const validation = UpdateWithdrawalSchema.safeParse(body);
    
    if (!validation.success) {
      return c.json({ 
        error: "Dados inválidos", 
        details: validation.error.errors 
      }, 400);
    }

    const { status, notes } = validation.data;
    const adminUser: any = (c as any).get("adminUser");

    // Get withdrawal details
    const withdrawal = await c.env.DB.prepare(
      "SELECT * FROM withdrawals WHERE id = ?"
    ).bind(withdrawalId).first();

    if (!withdrawal) {
      return c.json({ error: "Saque não encontrado" }, 404);
    }

    if (withdrawal.status !== "pending") {
      return c.json({ error: "Saque já foi processado" }, 400);
    }

    // Update withdrawal
    await c.env.DB.prepare(`
      UPDATE withdrawals 
      SET status = ?, processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, withdrawalId).run();

    // If approved, update user balance
    if (status === "approved") {
      await c.env.DB.prepare(`
        UPDATE user_settings 
        SET available_balance = available_balance - ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(withdrawal.net_amount, withdrawal.user_id).run();
    } else {
      // If rejected, return frozen balance to available
      await c.env.DB.prepare(`
        UPDATE user_settings 
        SET available_balance = available_balance + ?, 
            frozen_balance = frozen_balance - ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(withdrawal.net_amount, withdrawal.net_amount, withdrawal.user_id).run();
    }

    // Log action
    await c.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, old_data, new_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      adminUser.admin_user_id,
      status === "approved" ? "APPROVE_WITHDRAWAL" : "REJECT_WITHDRAWAL",
      "withdrawal",
      withdrawalId,
      JSON.stringify({ status: withdrawal.status }),
      JSON.stringify({ status, notes })
    ).run();

    return c.json({ success: true, message: `Saque ${status === "approved" ? "aprovado" : "rejeitado"} com sucesso` });

  } catch (error) {
    console.error("Update withdrawal error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Get global affiliates statistics
adminApi.get("/api/admin/affiliates/stats", requireAdminAuth, async (c) => {
  try {
    // Total active affiliates
    const activeResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM affiliates WHERE is_active = 1"
    ).first();
    const totalActive = (activeResult?.count as number) || 0;

    // Total inactive affiliates
    const inactiveResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM affiliates WHERE is_active = 0"
    ).first();
    const totalInactive = (inactiveResult?.count as number) || 0;

    // Total cashback generated by all affiliates - simplified query
    const cashbackResult = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(cashback_generated), 0) as total
      FROM company_purchases
    `).first();
    const totalCashbackGenerated = (cashbackResult?.total as number) || 0;

    // Total pending commissions (70% of cashback goes to network)
    const totalCommissionsPending = totalCashbackGenerated * 0.70;

    // New affiliates this month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const thisMonth = `${year}-${month}`;
    
    const newAffiliatesResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM affiliates WHERE strftime('%Y-%m', created_at) = ?"
    ).bind(thisMonth).first();
    const newAffiliatesThisMonth = (newAffiliatesResult?.count as number) || 0;

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

    console.log(`[ADMIN_API] Fetching affiliates - page: ${page}, limit: ${limit}, search: "${search}"`);

    // First, check total count
    let countQuery = "SELECT COUNT(*) as count FROM affiliates WHERE 1 = 1";
    const countParams = [];
    if (search) {
      countQuery += ` AND (full_name LIKE ? OR email LIKE ? OR cpf LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const totalCountResult = await c.env.DB.prepare(countQuery).bind(...countParams).first();
    const totalCountValue = (totalCountResult?.count as number) || 0;
    console.log(`[ADMIN_API] Total affiliates in DB: ${totalCountValue}`);

    // If no affiliates, return empty result
    if (totalCountValue === 0) {
      return c.json({
        affiliates: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0
        }
      });
    }

    // Get affiliates with basic info
    let query = `
      SELECT 
        a.id, a.full_name, a.email, a.cpf, a.whatsapp, a.referral_code,
        a.sponsor_id, a.is_active, a.is_verified, a.created_at, a.last_access_at
      FROM affiliates a
      WHERE 1 = 1
    `;

    const params = [];
    if (search) {
      query += ` AND (a.full_name LIKE ? OR a.email LIKE ? OR a.cpf LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    console.log(`[ADMIN_API] Query: ${query}`);
    const affiliatesResult = await c.env.DB.prepare(query).bind(...params).all();
    const affiliates = affiliatesResult.results || [];
    console.log(`[ADMIN_API] Found ${affiliates.length} affiliates`);

    // Calculate additional fields efficiently with separate simple queries
    const enrichedAffiliates = [];
    for (const affiliate of affiliates) {
      const affiliateId = (affiliate as any).id;
      
      // Count direct referrals
      const directReferralsResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM affiliates WHERE sponsor_id = ?"
      ).bind(affiliateId).first();
      const directReferrals = (directReferralsResult?.count as number) || 0;

      // Calculate total cashback - simplified to avoid complex JOINs
      const affiliateCpf = (affiliate as any).cpf;
      let totalCashback = 0;
      if (affiliateCpf) {
        const totalCashbackResult = await c.env.DB.prepare(`
          SELECT COALESCE(SUM(cashback_generated), 0) as total
          FROM company_purchases
          WHERE customer_coupon = ?
        `).bind(affiliateCpf).first();
        totalCashback = (totalCashbackResult?.total as number) || 0;
      }

      enrichedAffiliates.push({
        ...(affiliate as any),
        direct_referrals: directReferrals,
        total_cashback: totalCashback,
        pending_commissions: totalCashback * 0.7 // 70% of generated cashback as pending commissions
      });
    }

    console.log(`[ADMIN_API] Returning ${enrichedAffiliates.length} enriched affiliates`);

    return c.json({
      affiliates: enrichedAffiliates,
      pagination: {
        page,
        limit,
        total: totalCountValue,
        totalPages: Math.ceil(totalCountValue / limit)
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

    // Get current affiliate
    const affiliate = await c.env.DB.prepare(
      "SELECT * FROM affiliates WHERE id = ?"
    ).bind(affiliateId).first();

    if (!affiliate) {
      return c.json({ error: "Afiliado não encontrado" }, 404);
    }

    // Check if email is already in use by another affiliate
    const emailCheck = await c.env.DB.prepare(
      "SELECT id FROM affiliates WHERE email = ? AND id != ?"
    ).bind(email, affiliateId).first();

    if (emailCheck) {
      return c.json({ error: "Email já está em uso por outro afiliado" }, 409);
    }

    // Update affiliate
    await c.env.DB.prepare(`
      UPDATE affiliates 
      SET full_name = ?, email = ?, whatsapp = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(full_name, email, whatsapp || null, affiliateId).run();

    // Log action
    await c.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, old_data, new_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      adminUser.admin_user_id,
      "UPDATE_AFFILIATE",
      "affiliate",
      affiliateId,
      JSON.stringify({ 
        full_name: affiliate.full_name, 
        email: affiliate.email, 
        whatsapp: affiliate.whatsapp 
      }),
      JSON.stringify({ full_name, email, whatsapp })
    ).run();

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

    // Get current affiliate
    const affiliate = await c.env.DB.prepare(
      "SELECT * FROM affiliates WHERE id = ?"
    ).bind(affiliateId).first();

    if (!affiliate) {
      return c.json({ error: "Afiliado não encontrado" }, 404);
    }

    const newStatus = !affiliate.is_active;

    // Update status
    await c.env.DB.prepare(
      "UPDATE affiliates SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(newStatus, affiliateId).run();

    // Log action
    await c.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, old_data, new_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      adminUser.admin_user_id,
      newStatus ? "ACTIVATE_AFFILIATE" : "DEACTIVATE_AFFILIATE",
      "affiliate",
      affiliateId,
      JSON.stringify({ is_active: affiliate.is_active }),
      JSON.stringify({ is_active: newStatus })
    ).run();

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

    // Get current affiliate
    const affiliate = await c.env.DB.prepare(
      "SELECT * FROM affiliates WHERE id = ?"
    ).bind(affiliateId).first();

    if (!affiliate) {
      return c.json({ error: "Afiliado não encontrado" }, 404);
    }

    // Check if affiliate has dependent records
    const hasDownline = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM affiliates WHERE sponsor_id = ?"
    ).bind(affiliateId).first();

    if (hasDownline && (hasDownline.count as number) > 0) {
      return c.json({ 
        error: "Não é possível excluir afiliado que possui indicados na rede" 
      }, 400);
    }

    // Delete affiliate sessions first
    await c.env.DB.prepare(
      "DELETE FROM affiliate_sessions WHERE affiliate_id = ?"
    ).bind(affiliateId).run();

    // Delete password reset tokens
    await c.env.DB.prepare(
      "DELETE FROM affiliate_password_reset_tokens WHERE affiliate_id = ?"
    ).bind(affiliateId).run();

    // Update customer_coupons to remove affiliate_id reference
    await c.env.DB.prepare(
      "UPDATE customer_coupons SET affiliate_id = NULL WHERE affiliate_id = ?"
    ).bind(affiliateId).run();

    // Delete affiliate
    await c.env.DB.prepare(
      "DELETE FROM affiliates WHERE id = ?"
    ).bind(affiliateId).run();

    // Log action
    await c.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, old_data, new_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      adminUser.admin_user_id,
      "DELETE_AFFILIATE",
      "affiliate",
      affiliateId,
      JSON.stringify(affiliate),
      JSON.stringify({ deleted: true })
    ).run();

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

    let query = `
      SELECT c.*
      FROM companies c
      WHERE 1 = 1
    `;

    const params = [];
    if (search) {
      query += ` AND (c.nome_fantasia LIKE ? OR c.razao_social LIKE ? OR c.cnpj LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const companiesResult = await c.env.DB.prepare(query).bind(...params).all();
    const companies = companiesResult.results || [];

    // Enhance with additional data using separate queries
    const enhancedCompanies = [];
    for (const company of companies) {
      const companyId = (company as any).id;
      
      // Get cashback config
      const cashbackConfig = await c.env.DB.prepare(
        "SELECT cashback_percentage FROM company_cashback_config WHERE company_id = ?"
      ).bind(companyId).first();
      
      // Get purchase stats
      const purchaseStats = await c.env.DB.prepare(
        "SELECT COUNT(*) as total_purchases, COALESCE(SUM(cashback_generated), 0) as total_cashback_generated FROM company_purchases WHERE company_id = ?"
      ).bind(companyId).first();

      enhancedCompanies.push({
        ...(company as any),
        cashback_percentage: cashbackConfig?.cashback_percentage || 5.0,
        total_purchases: (purchaseStats?.total_purchases as number) || 0,
        total_cashback_generated: (purchaseStats?.total_cashback_generated as number) || 0
      });
    }

    // Get total count for pagination
    let countQuery = "SELECT COUNT(*) as count FROM companies WHERE 1 = 1";
    const countParams = [];
    if (search) {
      countQuery += ` AND (nome_fantasia LIKE ? OR razao_social LIKE ? OR cnpj LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const totalCount = await c.env.DB.prepare(countQuery).bind(...countParams).first();
    const totalCountValue = (totalCount?.count as number) || 0;

    return c.json({
      companies: enhancedCompanies,
      pagination: {
        page,
        limit,
        total: totalCountValue,
        totalPages: Math.ceil(totalCountValue / limit)
      }
    });

  } catch (error) {
    console.error("Get companies error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Toggle company status
adminApi.patch("/api/admin/companies/:id/toggle-status", requireAdminAuth, async (c) => {
  try {
    const companyId = c.req.param("id");
    const adminUser: any = (c as any).get("adminUser");

    // Get current company
    const company = await c.env.DB.prepare(
      "SELECT * FROM companies WHERE id = ?"
    ).bind(companyId).first();

    if (!company) {
      return c.json({ error: "Empresa não encontrada" }, 404);
    }

    const newStatus = !company.is_active;

    // Update status
    await c.env.DB.prepare(
      "UPDATE companies SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(newStatus, companyId).run();

    // Log action
    await c.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, old_data, new_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      adminUser.admin_user_id,
      newStatus ? "ACTIVATE_COMPANY" : "DEACTIVATE_COMPANY",
      "company",
      companyId,
      JSON.stringify({ is_active: company.is_active }),
      JSON.stringify({ is_active: newStatus })
    ).run();

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
    const settings = await c.env.DB.prepare(`
      SELECT level, percentage, is_active 
      FROM system_commission_settings 
      ORDER BY level ASC
    `).all();

    return c.json({
      settings: settings.results || []
    });

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

    // Update each level
    for (const setting of settings) {
      await c.env.DB.prepare(`
        UPDATE system_commission_settings 
        SET percentage = ?, updated_at = datetime('now')
        WHERE level = ?
      `).bind(setting.percentage, setting.level).run();
    }

    // Log action
    await c.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, new_data)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      adminUser.admin_user_id,
      "UPDATE_COMMISSION_SETTINGS",
      "system_settings",
      0,
      JSON.stringify(settings)
    ).run();

    return c.json({ 
      success: true, 
      message: "Configurações de comissão atualizadas com sucesso" 
    });

  } catch (error) {
    console.error("Update commission settings error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

export default adminApi;
