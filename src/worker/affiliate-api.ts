import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import "./types";

const app = new Hono<{ Bindings: Env }>();

// Get affiliate transactions/extract  
app.get("/api/transactions", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }

  try {
    // Get affiliate from session
    const { results: sessionResults } = await c.env.DB.prepare(`
      SELECT a.id, a.cpf FROM affiliate_sessions s
      JOIN affiliates a ON s.affiliate_id = a.id
      WHERE s.session_token = ? AND s.expires_at > datetime('now') AND a.is_active = 1
    `).bind(sessionToken).all();

    if (sessionResults.length === 0) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionResults[0] as any;

    // Get real transactions from database - search directly by CPF
    // Show actual affiliate commission (10% of 70% = 7% of total cashback)
    const { results: transactionResults } = await c.env.DB.prepare(`
      SELECT cp.id, c.nome_fantasia as company_name, cp.purchase_value, 
             ROUND(cp.cashback_generated * 0.07, 2) as cashback_value, 1 as level_earned,
             cp.created_at as transaction_date
      FROM company_purchases cp
      JOIN companies c ON cp.company_id = c.id
      WHERE cp.customer_coupon = ?
      ORDER BY cp.created_at DESC
      LIMIT 50
    `).bind(affiliate.cpf).all();

    return c.json(transactionResults);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return c.json({ error: "Failed to fetch transactions" }, 500);
  }
});

// Get network members
app.get("/api/network/members", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }

  try {
    // Get affiliate from session
    const { results: sessionResults } = await c.env.DB.prepare(`
      SELECT a.id, a.cpf FROM affiliate_sessions s
      JOIN affiliates a ON s.affiliate_id = a.id
      WHERE s.session_token = ? AND s.expires_at > datetime('now') AND a.is_active = 1
    `).bind(sessionToken).all();

    if (sessionResults.length === 0) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionResults[0] as any;

    // Helper function to get all network members recursively
    const getAllNetworkMembers = async (sponsorId: number, level: number = 1, maxLevel: number = 10): Promise<any[]> => {
      if (level > maxLevel) {
        return [];
      }

      // Get direct referrals
      const { results: directMembers } = await c.env.DB.prepare(`
        SELECT id, email, cpf, full_name, created_at, last_access_at
        FROM affiliates
        WHERE sponsor_id = ? AND is_active = 1
        ORDER BY created_at DESC
      `).bind(sponsorId).all();

      const members: any[] = [];

      for (const member of directMembers) {
        const m = member as any;
        
        // Check if active (accessed in last 30 days)
        const isActive = m.last_access_at ? 
          new Date(m.last_access_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : 
          false;

        // Get purchase count for this member
        const { results: purchaseResults } = await c.env.DB.prepare(`
          SELECT COUNT(*) as count FROM company_purchases WHERE customer_coupon = ?
        `).bind(m.cpf || '').all();
        
        const totalPurchases = (purchaseResults[0] as any)?.count || 0;
        const lastPurchaseDate = m.last_access_at || m.created_at;

        members.push({
          id: m.id,
          email: m.email,
          cpf: m.cpf || 'N/A',
          level: level,
          is_active_this_month: isActive,
          last_purchase_date: lastPurchaseDate,
          total_purchases: totalPurchases,
          created_at: m.created_at
        });

        // Recursively get this member's network
        const subMembers = await getAllNetworkMembers(m.id, level + 1, maxLevel);
        members.push(...subMembers);
      }

      return members;
    };

    // Get all network members starting from current affiliate
    const allMembers = await getAllNetworkMembers(affiliate.id, 1, 10);

    return c.json(allMembers);
  } catch (error) {
    console.error('Error fetching network members:', error);
    return c.json({ error: "Failed to fetch network members" }, 500);
  }
});

// Get network stats
app.get("/api/network/stats", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }

  try {
    // Get affiliate from session
    const { results: sessionResults } = await c.env.DB.prepare(`
      SELECT a.id FROM affiliate_sessions s
      JOIN affiliates a ON s.affiliate_id = a.id
      WHERE s.session_token = ? AND s.expires_at > datetime('now') AND a.is_active = 1
    `).bind(sessionToken).all();

    if (sessionResults.length === 0) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionResults[0] as any;

    // Helper function to count members by level
    const countMembersByLevel = async (sponsorId: number, currentLevel: number = 1, maxLevel: number = 10): Promise<Record<number, number>> => {
      if (currentLevel > maxLevel) {
        return {};
      }

      const levelCounts: Record<number, number> = {};

      // Get direct referrals
      const { results: directMembers } = await c.env.DB.prepare(`
        SELECT id FROM affiliates WHERE sponsor_id = ? AND is_active = 1
      `).bind(sponsorId).all();

      levelCounts[currentLevel] = directMembers.length;

      // Recursively count sub-levels
      for (const member of directMembers) {
        const subCounts = await countMembersByLevel((member as any).id, currentLevel + 1, maxLevel);
        for (const [level, count] of Object.entries(subCounts)) {
          const levelNum = parseInt(level);
          levelCounts[levelNum] = (levelCounts[levelNum] || 0) + count;
        }
      }

      return levelCounts;
    };

    // Get counts for all levels
    const levelCounts = await countMembersByLevel(affiliate.id, 1, 10);

    // Count total active members across all levels
    const countActiveMembers = async (sponsorId: number, currentLevel: number = 1, maxLevel: number = 10): Promise<number> => {
      if (currentLevel > maxLevel) {
        return 0;
      }

      let activeCount = 0;

      // Get direct referrals
      const { results: directMembers } = await c.env.DB.prepare(`
        SELECT id, last_access_at FROM affiliates WHERE sponsor_id = ? AND is_active = 1
      `).bind(sponsorId).all();

      for (const member of directMembers) {
        const m = member as any;
        // Check if active (accessed in last 30 days)
        const isActive = m.last_access_at ? 
          new Date(m.last_access_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : 
          false;
        
        if (isActive) {
          activeCount++;
        }

        // Recursively count active in sub-levels
        const subActiveCount = await countActiveMembers(m.id, currentLevel + 1, maxLevel);
        activeCount += subActiveCount;
      }

      return activeCount;
    };

    const totalActive = await countActiveMembers(affiliate.id, 1, 10);

    // Calculate total members
    const totalMembers = Object.values(levelCounts).reduce((sum, count) => sum + count, 0);

    const stats = {
      level1: levelCounts[1] || 0,
      level2: levelCounts[2] || 0,
      level3: levelCounts[3] || 0,
      level4: levelCounts[4] || 0,
      level5: levelCounts[5] || 0,
      level6: levelCounts[6] || 0,
      level7: levelCounts[7] || 0,
      level8: levelCounts[8] || 0,
      level9: levelCounts[9] || 0,
      level10: levelCounts[10] || 0,
      total_active: totalActive,
      total_inactive: totalMembers - totalActive
    };

    return c.json(stats);
  } catch (error) {
    console.error('Error fetching network stats:', error);
    return c.json({ error: "Failed to fetch network stats" }, 500);
  }
});

// Get network preference
app.get("/api/affiliate/network/preference", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }

  try {
    // Get affiliate from session
    const { results: sessionResults } = await c.env.DB.prepare(`
      SELECT a.id FROM affiliate_sessions s
      JOIN affiliates a ON s.affiliate_id = a.id
      WHERE s.session_token = ? AND s.expires_at > datetime('now') AND a.is_active = 1
    `).bind(sessionToken).all();

    if (sessionResults.length === 0) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionResults[0] as any;

    // Get user settings for leg preference from user_profiles table
    const { results: profileResults } = await c.env.DB.prepare(
      "SELECT id FROM user_profiles WHERE mocha_user_id = ?"
    ).bind(`affiliate_${affiliate.id}`).all();

    if (profileResults.length === 0) {
      return c.json({ preference: 'auto' });
    }

    const profile = profileResults[0] as any;

    // Get user settings for leg preference
    const { results: settingsResults } = await c.env.DB.prepare(
      "SELECT leg_preference FROM user_settings WHERE user_id = ?"
    ).bind(profile.id).all();

    const preference = settingsResults[0]?.leg_preference || 'auto';
    
    // Convert database format to API format
    const apiPreference = preference === 'automatic' ? 'auto' : preference;

    return c.json({ preference: apiPreference });
  } catch (error) {
    console.error('Error fetching network preference:', error);
    return c.json({ error: "Failed to fetch network preference" }, 500);
  }
});

// Update network preference
app.put("/api/affiliate/network/preference", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');
  const body = await c.req.json();

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }
  
  try {
    // Get affiliate from session
    const { results: sessionResults } = await c.env.DB.prepare(`
      SELECT a.id FROM affiliate_sessions s
      JOIN affiliates a ON s.affiliate_id = a.id
      WHERE s.session_token = ? AND s.expires_at > datetime('now') AND a.is_active = 1
    `).bind(sessionToken).all();

    if (sessionResults.length === 0) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionResults[0] as any;
    const { preference } = body;

    // Validate preference
    if (!['left', 'right', 'center', 'auto'].includes(preference)) {
      return c.json({ error: "Preferência inválida" }, 400);
    }

    // Convert API format to database format
    const dbPreference = preference === 'auto' ? 'automatic' : preference;

    // Get or create user profile
    let { results: profileResults } = await c.env.DB.prepare(
      "SELECT id FROM user_profiles WHERE mocha_user_id = ?"
    ).bind(`affiliate_${affiliate.id}`).all();

    if (profileResults.length === 0) {
      await c.env.DB.prepare(`
        INSERT INTO user_profiles (mocha_user_id, role, is_active)
        VALUES (?, 'affiliate', 1)
      `).bind(`affiliate_${affiliate.id}`).run();
      
      profileResults = await c.env.DB.prepare(
        "SELECT id FROM user_profiles WHERE mocha_user_id = ?"
      ).bind(`affiliate_${affiliate.id}`).all().then(r => r.results);
    }

    const profile = profileResults[0] as any;

    // Update or create user settings
    await c.env.DB.prepare(`
      INSERT INTO user_settings (user_id, leg_preference, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        leg_preference = excluded.leg_preference,
        updated_at = CURRENT_TIMESTAMP
    `).bind(profile.id, dbPreference).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating network preference:', error);
    return c.json({ error: "Failed to update network preference" }, 500);
  }
});

// Get network tree
app.get("/api/affiliate/network/tree", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');
  const maxDepth = parseInt(c.req.query('max_depth') || '10');

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }
  
  try {
    // Get affiliate from session
    const { results: sessionResults } = await c.env.DB.prepare(`
      SELECT a.id, a.cpf, a.full_name, a.email, a.created_at, a.last_access_at FROM affiliate_sessions s
      JOIN affiliates a ON s.affiliate_id = a.id
      WHERE s.session_token = ? AND s.expires_at > datetime('now') AND a.is_active = 1
    `).bind(sessionToken).all();

    if (sessionResults.length === 0) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionResults[0] as any;

    // Helper function to recursively build network tree
    const buildNetworkTree = async (affiliateId: number, currentLevel: number): Promise<any> => {
      if (currentLevel > maxDepth) {
        return null;
      }

      // Get this affiliate's information
      const { results: affiliateInfo } = await c.env.DB.prepare(`
        SELECT id, full_name, email, cpf, created_at, last_access_at, is_active
        FROM affiliates
        WHERE id = ? AND is_active = 1
      `).bind(affiliateId).all();

      if (affiliateInfo.length === 0) {
        return null;
      }

      const info = affiliateInfo[0] as any;

      // Get direct referrals (children)
      const { results: childrenResults } = await c.env.DB.prepare(`
        SELECT id, full_name, email, cpf, created_at, last_access_at, is_active
        FROM affiliates
        WHERE sponsor_id = ? AND is_active = 1
        ORDER BY created_at ASC
      `).bind(affiliateId).all();

      // Count direct referrals
      const directReferrals = childrenResults.length;

      // Check if active (accessed in last 30 days)
      const isActive = info.last_access_at ? 
        new Date(info.last_access_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : 
        false;

      // Build node
      const node = {
        id: info.id.toString(),
        name: info.full_name || info.email?.split('@')[0] || 'Afiliado',
        email: info.email,
        coupon: info.cpf || 'N/A',
        active: isActive,
        level: currentLevel,
        cpf: info.cpf || 'N/A',
        direct_referrals: directReferrals,
        signup_date: info.created_at,
        children: [] as any[]
      };

      // Recursively build children
      if (currentLevel < maxDepth) {
        for (const child of childrenResults) {
          const childNode = await buildNetworkTree((child as any).id, currentLevel + 1);
          if (childNode) {
            node.children.push(childNode);
          }
        }
      }

      return node;
    };

    // Build tree starting from current affiliate
    const tree = await buildNetworkTree(affiliate.id, 0);

    return c.json(tree);
  } catch (error) {
    console.error('Error fetching network tree:', error);
    return c.json({ error: "Failed to fetch network tree" }, 500);
  }
});

// Get network summary by levels
app.get("/api/affiliate/network/summary", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }
  
  try {
    // Get affiliate from session
    const { results: sessionResults } = await c.env.DB.prepare(`
      SELECT a.id FROM affiliate_sessions s
      JOIN affiliates a ON s.affiliate_id = a.id
      WHERE s.session_token = ? AND s.expires_at > datetime('now') AND a.is_active = 1
    `).bind(sessionToken).all();

    if (sessionResults.length === 0) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionResults[0] as any;

    // Helper function to count members by level
    const countMembersByLevel = async (sponsorId: number, currentLevel: number = 1, maxLevel: number = 10): Promise<Record<number, number>> => {
      if (currentLevel > maxLevel) {
        return {};
      }

      const levelCounts: Record<number, number> = {};

      // Get direct referrals
      const { results: directMembers } = await c.env.DB.prepare(`
        SELECT id FROM affiliates WHERE sponsor_id = ? AND is_active = 1
      `).bind(sponsorId).all();

      levelCounts[currentLevel] = directMembers.length;

      // Recursively count sub-levels
      for (const member of directMembers) {
        const subCounts = await countMembersByLevel((member as any).id, currentLevel + 1, maxLevel);
        for (const [level, count] of Object.entries(subCounts)) {
          const levelNum = parseInt(level);
          levelCounts[levelNum] = (levelCounts[levelNum] || 0) + count;
        }
      }

      return levelCounts;
    };

    // Get counts for all levels
    const levelCounts = await countMembersByLevel(affiliate.id, 1, 10);

    const summary = {
      levels: {
        "1": levelCounts[1] || 0,
        "2": levelCounts[2] || 0,
        "3": levelCounts[3] || 0,
        "4": levelCounts[4] || 0,
        "5": levelCounts[5] || 0,
        "6": levelCounts[6] || 0,
        "7": levelCounts[7] || 0,
        "8": levelCounts[8] || 0,
        "9": levelCounts[9] || 0,
        "10": levelCounts[10] || 0
      }
    };

    return c.json(summary);
  } catch (error) {
    console.error('Error fetching network summary:', error);
    return c.json({ error: "Failed to fetch network summary" }, 500);
  }
});

// Get user balance
app.get("/api/users/balance", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }
  
  try {
    // Get affiliate from session
    const { results: sessionResults } = await c.env.DB.prepare(`
      SELECT a.id, a.cpf FROM affiliate_sessions s
      JOIN affiliates a ON s.affiliate_id = a.id
      WHERE s.session_token = ? AND s.expires_at > datetime('now') AND a.is_active = 1
    `).bind(sessionToken).all();

    if (sessionResults.length === 0) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionResults[0] as any;

    console.log('[BALANCE] Calculating balance for affiliate:', affiliate.id);

    // METHOD 1: Try to get commissions from commission_distributions table
    const { results: commissionResults } = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(commission_amount), 0) as total_commissions
      FROM commission_distributions
      WHERE affiliate_id = ?
    `).bind(affiliate.id).all();

    let totalCommissions = (commissionResults[0] as any)?.total_commissions || 0;

    console.log('[BALANCE] Commissions from distributions table:', totalCommissions);

    // METHOD 2: Fallback - calculate from actual purchases like Extract page does
    if (totalCommissions === 0) {
      console.log('[BALANCE] No commissions found, calculating from purchases...');
      
      // Get real transactions from database - search directly by CPF (same as Extract)
      const { results: transactionResults } = await c.env.DB.prepare(`
        SELECT COALESCE(SUM(cp.cashback_generated * 0.07), 0) as cashback_total
        FROM company_purchases cp
        JOIN companies c ON cp.company_id = c.id
        WHERE cp.customer_coupon = ?
      `).bind(affiliate.cpf).all();

      const purchaseCashback = (transactionResults[0] as any)?.cashback_total || 0;
      totalCommissions = purchaseCashback;
      
      console.log('[BALANCE] Calculated from purchases:', totalCommissions);
    }

    // Get or create user profile
    let { results: profileResults } = await c.env.DB.prepare(
      "SELECT id FROM user_profiles WHERE mocha_user_id = ?"
    ).bind(`affiliate_${affiliate.id}`).all();

    if (profileResults.length === 0) {
      await c.env.DB.prepare(`
        INSERT INTO user_profiles (mocha_user_id, cpf, role, is_active)
        VALUES (?, ?, 'affiliate', 1)
      `).bind(`affiliate_${affiliate.id}`, affiliate.cpf || '').run();
      
      profileResults = await c.env.DB.prepare(
        "SELECT id FROM user_profiles WHERE mocha_user_id = ?"
      ).bind(`affiliate_${affiliate.id}`).all().then(r => r.results);
    }

    const profile = profileResults[0] as any;

    // Calculate total approved withdrawals
    const { results: withdrawalResults } = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(amount_requested), 0) as total_withdrawn
      FROM withdrawals
      WHERE user_id = ? AND status = 'approved'
    `).bind(profile.id).all();

    const totalWithdrawn = (withdrawalResults[0] as any)?.total_withdrawn || 0;

    console.log('[BALANCE] Total withdrawn (approved):', totalWithdrawn);

    // Calculate frozen balance (pending withdrawals)
    const { results: frozenResults } = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(amount_requested), 0) as frozen
      FROM withdrawals
      WHERE user_id = ? AND status = 'pending'
    `).bind(profile.id).all();

    const frozenBalance = (frozenResults[0] as any)?.frozen || 0;

    console.log('[BALANCE] Frozen balance (pending withdrawals):', frozenBalance);

    // Calculate available balance = total commissions - total withdrawn - frozen
    const availableBalance = Math.max(0, totalCommissions - totalWithdrawn - frozenBalance);

    console.log('[BALANCE] Calculated available balance:', availableBalance);

    // Check if affiliate is active (has any earnings)
    const isActiveThisMonth = totalCommissions > 0;

    // Get or create user settings for PIX key
    let { results: settingsResults } = await c.env.DB.prepare(
      "SELECT pix_key FROM user_settings WHERE user_id = ?"
    ).bind(profile.id).all();

    let pixKey = null;
    if (settingsResults.length === 0) {
      // Create default settings
      await c.env.DB.prepare(`
        INSERT INTO user_settings (user_id, is_active_this_month)
        VALUES (?, ?)
      `).bind(profile.id, isActiveThisMonth ? 1 : 0).run();
    } else {
      pixKey = (settingsResults[0] as any)?.pix_key;
    }

    console.log('[BALANCE] Final calculated values:', {
      available_balance: availableBalance,
      frozen_balance: frozenBalance,
      total_earnings: totalCommissions,
      total_withdrawn: totalWithdrawn,
      is_active: isActiveThisMonth
    });

    return c.json({
      available_balance: availableBalance,
      frozen_balance: frozenBalance,
      total_earnings: totalCommissions,
      company_earnings: 0, // CashMais earnings calculated separately
      net_earnings: totalCommissions, // Same as total earnings (commissions are already net)
      is_active_this_month: isActiveThisMonth,
      pix_key: pixKey
    });
  } catch (error) {
    console.error('Error fetching user balance:', error);
    return c.json({ error: "Failed to fetch user balance" }, 500);
  }
});

// Get affiliate settings
app.get("/api/affiliate/settings", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }
  
  try {
    // Get affiliate from session
    const { results: sessionResults } = await c.env.DB.prepare(`
      SELECT a.id, a.cpf, a.full_name, a.whatsapp FROM affiliate_sessions s
      JOIN affiliates a ON s.affiliate_id = a.id
      WHERE s.session_token = ? AND s.expires_at > datetime('now') AND a.is_active = 1
    `).bind(sessionToken).all();

    if (sessionResults.length === 0) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionResults[0] as any;

    // Get or create user profile (consistent with balance endpoint)
    let { results: profileResults } = await c.env.DB.prepare(
      "SELECT id FROM user_profiles WHERE mocha_user_id = ?"
    ).bind(`affiliate_${affiliate.id}`).all();

    if (profileResults.length === 0) {
      await c.env.DB.prepare(`
        INSERT INTO user_profiles (mocha_user_id, cpf, role, is_active)
        VALUES (?, ?, 'affiliate', 1)
      `).bind(`affiliate_${affiliate.id}`, affiliate.cpf || '').run();
      
      profileResults = await c.env.DB.prepare(
        "SELECT id FROM user_profiles WHERE mocha_user_id = ?"
      ).bind(`affiliate_${affiliate.id}`).all().then(r => r.results);
    }

    const profile = profileResults[0] as any;

    // Get or create user settings using profile.id (consistent with balance endpoint)
    let { results: settingsResults } = await c.env.DB.prepare(
      "SELECT * FROM user_settings WHERE user_id = ?"
    ).bind(profile.id).all();

    if (settingsResults.length === 0) {
      // Create default settings using profile.id
      await c.env.DB.prepare(`
        INSERT INTO user_settings (user_id, leg_preference)
        VALUES (?, 'automatic')
      `).bind(profile.id).run();
      
      settingsResults = await c.env.DB.prepare(
        "SELECT * FROM user_settings WHERE user_id = ?"
      ).bind(profile.id).all().then(r => r.results);
    }

    const settings = settingsResults[0] as any;

    return c.json({
      pix_key: settings.pix_key,
      leg_preference: settings.leg_preference || 'automatic',
      full_name: affiliate.full_name,
      phone: affiliate.whatsapp
    });
  } catch (error) {
    console.error('Error fetching affiliate settings:', error);
    return c.json({ error: "Failed to fetch affiliate settings" }, 500);
  }
});

// Update affiliate settings
app.post("/api/affiliate/settings", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');
  const body = await c.req.json();

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }
  
  try {
    // Get affiliate from session
    const { results: sessionResults } = await c.env.DB.prepare(`
      SELECT a.id, a.cpf FROM affiliate_sessions s
      JOIN affiliates a ON s.affiliate_id = a.id
      WHERE s.session_token = ? AND s.expires_at > datetime('now') AND a.is_active = 1
    `).bind(sessionToken).all();

    if (sessionResults.length === 0) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionResults[0] as any;
    const { full_name, phone, pix_key, leg_preference } = body;

    // Validate leg preference
    if (!['left', 'right', 'automatic'].includes(leg_preference)) {
      return c.json({ error: "Preferência de perna inválida" }, 400);
    }

    // Update affiliate profile data
    await c.env.DB.prepare(`
      UPDATE affiliates SET 
        full_name = ?,
        whatsapp = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(full_name, phone, affiliate.id).run();

    // Get or create user profile
    let { results: profileResults } = await c.env.DB.prepare(
      "SELECT id FROM user_profiles WHERE mocha_user_id = ?"
    ).bind(`affiliate_${affiliate.id}`).all();

    if (profileResults.length === 0) {
      await c.env.DB.prepare(`
        INSERT INTO user_profiles (mocha_user_id, cpf, role, is_active)
        VALUES (?, ?, 'affiliate', 1)
      `).bind(`affiliate_${affiliate.id}`, affiliate.cpf || '').run();
      
      profileResults = await c.env.DB.prepare(
        "SELECT id FROM user_profiles WHERE mocha_user_id = ?"
      ).bind(`affiliate_${affiliate.id}`).all().then(r => r.results);
    }

    const profile = profileResults[0] as any;

    // Update or create user settings
    await c.env.DB.prepare(`
      INSERT INTO user_settings (user_id, pix_key, leg_preference, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        pix_key = excluded.pix_key,
        leg_preference = excluded.leg_preference,
        updated_at = CURRENT_TIMESTAMP
    `).bind(profile.id, pix_key, leg_preference).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating affiliate settings:', error);
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

// Get withdrawals
app.get("/api/withdrawals", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }
  
  try {
    // Get affiliate from session
    const { results: sessionResults } = await c.env.DB.prepare(`
      SELECT a.id FROM affiliate_sessions s
      JOIN affiliates a ON s.affiliate_id = a.id
      WHERE s.session_token = ? AND s.expires_at > datetime('now') AND a.is_active = 1
    `).bind(sessionToken).all();

    if (sessionResults.length === 0) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionResults[0] as any;

    // Get user profile to find withdrawals (consistent with other endpoints)
    const { results: profileResults } = await c.env.DB.prepare(
      "SELECT id FROM user_profiles WHERE mocha_user_id = ?"
    ).bind(`affiliate_${affiliate.id}`).all();

    if (profileResults.length === 0) {
      return c.json([]);
    }

    const profile = profileResults[0] as any;

    // Get real withdrawals from database using profile.id
    const { results: withdrawalResults } = await c.env.DB.prepare(`
      SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
    `).bind(profile.id).all();

    return c.json(withdrawalResults);
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    return c.json({ error: "Failed to fetch withdrawals" }, 500);
  }
});

// Create withdrawal request
app.post("/api/withdrawals", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');
  const body = await c.req.json();

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }
  
  try {
    // Get affiliate from session
    const { results: sessionResults } = await c.env.DB.prepare(`
      SELECT a.id FROM affiliate_sessions s
      JOIN affiliates a ON s.affiliate_id = a.id
      WHERE s.session_token = ? AND s.expires_at > datetime('now') AND a.is_active = 1
    `).bind(sessionToken).all();

    if (sessionResults.length === 0) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionResults[0] as any;
    const { amount } = body;

    if (!amount || amount <= 0) {
      return c.json({ error: "Valor inválido" }, 400);
    }

    const currentDate = new Date();

    // Check if already made a withdrawal this month
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const profileCheckResult = await c.env.DB.prepare(
      "SELECT id FROM user_profiles WHERE mocha_user_id = ?"
    ).bind(`affiliate_${affiliate.id}`).all();

    if (profileCheckResult.results.length > 0) {
      const profile = profileCheckResult.results[0] as any;
      
      const existingWithdrawal = await c.env.DB.prepare(`
        SELECT id FROM withdrawals 
        WHERE user_id = ? 
        AND strftime('%Y-%m', created_at) = ?
      `).bind(profile.id, `${currentYear}-${currentMonth.toString().padStart(2, '0')}`).first();

      if (existingWithdrawal) {
        return c.json({ 
          error: "Você já solicitou um saque este mês. Saques são limitados a 1 por mês." 
        }, 400);
      }
    }

    // Get user profile and settings (consistent with other endpoints)
    const { results: profileResults } = await c.env.DB.prepare(
      "SELECT id FROM user_profiles WHERE mocha_user_id = ?"
    ).bind(`affiliate_${affiliate.id}`).all();

    if (profileResults.length === 0) {
      return c.json({ error: "Configure suas informações primeiro" }, 400);
    }

    const profile = profileResults[0] as any;

    // Get user settings using profile.id
    const { results: settingsResults } = await c.env.DB.prepare(
      "SELECT * FROM user_settings WHERE user_id = ?"
    ).bind(profile.id).all();

    if (settingsResults.length === 0) {
      return c.json({ error: "Configure suas informações primeiro" }, 400);
    }

    const settings = settingsResults[0] as any;

    if (!settings.pix_key) {
      return c.json({ error: "Configure sua chave PIX primeiro" }, 400);
    }

    if (!settings.is_active_this_month) {
      return c.json({ error: "Você precisa ter feito pelo menos uma compra no mês anterior" }, 400);
    }

    // Calculate net available balance (70% of total earnings - already withdrawn)
    const totalEarnings = settings.total_earnings || 0;
    const netAvailableBalance = (totalEarnings * 0.70) - ((settings.total_earnings || 0) - (settings.available_balance || 0));
    
    if (amount > netAvailableBalance) {
      return c.json({ error: "Saldo insuficiente" }, 400);
    }

    // No additional fees - the 30% was already separated from earnings
    const feeAmount = 0; // No fee on withdrawal
    const netAmount = amount; // User receives full requested amount

    // Create real withdrawal in database
    const withdrawalResult = await c.env.DB.prepare(`
      INSERT INTO withdrawals (
        user_id, amount_requested, fee_amount, net_amount, 
        status, pix_key, created_at
      ) VALUES (?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)
    `).bind(profile.id, amount, feeAmount, netAmount, settings.pix_key).run();

    if (!withdrawalResult.success) {
      return c.json({ error: "Erro ao criar solicitação de saque" }, 500);
    }

    // Update user balance (freeze the requested amount)
    await c.env.DB.prepare(`
      UPDATE user_settings SET 
        available_balance = available_balance - ?,
        frozen_balance = frozen_balance + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).bind(amount, amount, profile.id).run();

    return c.json({ 
      success: true,
      withdrawal: {
        id: withdrawalResult.meta.last_row_id,
        amount_requested: amount,
        fee_amount: feeAmount,
        net_amount: netAmount,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error creating withdrawal:', error);
    return c.json({ error: "Failed to create withdrawal request" }, 500);
  }
});

export default app;
