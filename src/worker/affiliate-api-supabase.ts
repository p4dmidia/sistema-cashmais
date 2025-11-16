import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { createClient } from '@supabase/supabase-js'

const app = new Hono<{ Bindings: Env }>();

// Helper function to create Supabase client
function createSupabaseClient(c: any) {
  return createClient(
    c.env.SUPABASE_URL || 'https://hffxmntvtsimwlsapfod.supabase.co',
    c.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmZnhtbnR2dHNpbXdsc2FwZm9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc0NjA0OCwiZXhwIjoyMDc4MzIyMDQ4fQ.4cPUqXeAEkA5kVwDQU1pmVJoiJRoAtnPtojySH3l_mI'
  );
}

// Get affiliate transactions/extract  
app.get("/api/transactions", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }

  try {
    const supabase = createSupabaseClient(c);
    
    // Get affiliate from session
    const { data: sessionData, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .select(`
        affiliate_id,
        affiliates!inner(id, cpf)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single();

    if (sessionError || !sessionData) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionData.affiliates;

    // Get real transactions from database - search directly by CPF
    // Show actual affiliate commission (10% of 70% = 7% of total cashback)
    const { data: transactions, error: transactionsError } = await supabase
      .from('company_purchases')
      .select(`
        id,
        companies!inner(nome_fantasia),
        purchase_value,
        cashback_generated,
        created_at
      `)
      .eq('customer_coupon', affiliate.cpf)
      .order('created_at', { ascending: false })
      .limit(50);

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return c.json({ error: "Failed to fetch transactions" }, 500);
    }

    const formattedTransactions = transactions?.map(tx => ({
      id: tx.id,
      company_name: tx.companies.nome_fantasia,
      purchase_value: tx.purchase_value,
      cashback_value: Math.round(tx.cashback_generated * 0.07 * 100) / 100, // 7% commission
      level_earned: 1,
      transaction_date: tx.created_at
    })) || [];

    return c.json(formattedTransactions);
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
    const supabase = createSupabaseClient(c);
    
    // Get affiliate from session
    const { data: sessionData, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .select(`
        affiliate_id,
        affiliates!inner(id, cpf)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single();

    if (sessionError || !sessionData) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionData.affiliates;

    // Helper function to get all network members recursively
    const getAllNetworkMembers = async (sponsorId: number, level: number = 1, maxLevel: number = 10): Promise<any[]> => {
      if (level > maxLevel) {
        return [];
      }

      // Get direct referrals
      const { data: directMembers, error: membersError } = await supabase
        .from('affiliates')
        .select('id, email, cpf, full_name, created_at, last_access_at')
        .eq('sponsor_id', sponsorId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (membersError) {
        console.error('Error fetching network members:', membersError);
        return [];
      }

      const members: any[] = [];

      for (const member of directMembers || []) {
        // Check if active (accessed in last 30 days)
        const isActive = member.last_access_at ? 
          new Date(member.last_access_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : 
          false;

        // Get purchase count for this member
        const { data: purchaseData, error: purchaseError } = await supabase
          .from('company_purchases')
          .select('id', { count: 'exact', head: true })
          .eq('customer_coupon', member.cpf || '');

        if (purchaseError) {
          console.error('Error fetching purchase count:', purchaseError);
        }

        const totalPurchases = purchaseData ? purchaseData.length : 0;
        const lastPurchaseDate = member.last_access_at || member.created_at;

        members.push({
          id: member.id,
          email: member.email,
          cpf: member.cpf || 'N/A',
          level: level,
          is_active_this_month: isActive,
          last_purchase_date: lastPurchaseDate,
          total_purchases: totalPurchases,
          created_at: member.created_at
        });

        // Recursively get this member's network
        const subMembers = await getAllNetworkMembers(member.id, level + 1, maxLevel);
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
    const supabase = createSupabaseClient(c);
    
    // Get affiliate from session
    const { data: sessionData, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .select(`
        affiliate_id,
        affiliates!inner(id)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single();

    if (sessionError || !sessionData) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionData.affiliates;

    // Helper function to count members by level
    const countMembersByLevel = async (sponsorId: number, currentLevel: number = 1, maxLevel: number = 10): Promise<Record<number, number>> => {
      if (currentLevel > maxLevel) {
        return {};
      }

      const levelCounts: Record<number, number> = {};

      // Get direct referrals
      const { data: directMembers, error: membersError } = await supabase
        .from('affiliates')
        .select('id')
        .eq('sponsor_id', sponsorId)
        .eq('is_active', true);

      if (membersError) {
        console.error('Error counting members by level:', membersError);
        return {};
      }

      levelCounts[currentLevel] = directMembers?.length || 0;

      // Recursively count sub-levels
      for (const member of directMembers || []) {
        const subCounts = await countMembersByLevel(member.id, currentLevel + 1, maxLevel);
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
      const { data: directMembers, error: membersError } = await supabase
        .from('affiliates')
        .select('id, last_access_at')
        .eq('sponsor_id', sponsorId)
        .eq('is_active', true);

      if (membersError) {
        console.error('Error counting active members:', membersError);
        return 0;
      }

      for (const member of directMembers || []) {
        // Check if active (accessed in last 30 days)
        const isActive = member.last_access_at ? 
          new Date(member.last_access_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : 
          false;
        
        if (isActive) {
          activeCount++;
        }

        // Recursively count active in sub-levels
        const subActiveCount = await countActiveMembers(member.id, currentLevel + 1, maxLevel);
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

// Get user balance
app.get("/api/users/balance", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }
  
  try {
    const supabase = createSupabaseClient(c);
    
    console.log('[BALANCE] Starting balance calculation with Supabase');
    
    // Get affiliate from session
    const { data: sessionData, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .select(`
        affiliate_id,
        affiliates!inner(id, cpf)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single();

    if (sessionError || !sessionData) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionData.affiliates;

    console.log('[BALANCE] Calculating balance for affiliate:', affiliate.id);

    // METHOD 1: Try to get commissions from commission_distributions table
    // Note: This table doesn't exist in Supabase yet, so we'll skip this for now
    let totalCommissions = 0;

    console.log('[BALANCE] No commission_distributions table, calculating from purchases...');
    
    // METHOD 2: Calculate from actual purchases like Extract page does
    // Get real transactions from database - search directly by CPF (same as Extract)
    const { data: purchaseTransactions, error: purchaseError } = await supabase
      .from('company_purchases')
      .select(`
        cashback_generated
      `)
      .eq('customer_coupon', affiliate.cpf);

    if (purchaseError) {
      console.error('[BALANCE] Error fetching purchases:', purchaseError);
    } else {
      const purchaseCashback = purchaseTransactions?.reduce((sum, tx) => sum + (tx.cashback_generated * 0.07), 0) || 0;
      totalCommissions = Math.round(purchaseCashback * 100) / 100;
      console.log('[BALANCE] Calculated from purchases:', totalCommissions);
    }

    // Get or create user profile
    let { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('mocha_user_id', `affiliate_${affiliate.id}`)
      .single();

    if (profileError || !profileData) {
      // Create user profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          mocha_user_id: `affiliate_${affiliate.id}`,
          cpf: affiliate.cpf || '',
          role: 'affiliate',
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        console.error('[BALANCE] Error creating user profile:', createError);
        return c.json({ error: "Failed to create user profile" }, 500);
      }
      
      profileData = newProfile;
    }

    const profile = profileData;

    // Calculate total approved withdrawals
    const { data: withdrawalData, error: withdrawalError } = await supabase
      .from('withdrawals')
      .select('amount_requested')
      .eq('user_id', profile.id)
      .eq('status', 'approved');

    if (withdrawalError) {
      console.error('[BALANCE] Error fetching withdrawals:', withdrawalError);
    }

    const totalWithdrawn = withdrawalData?.reduce((sum, w) => sum + w.amount_requested, 0) || 0;
    console.log('[BALANCE] Total withdrawn (approved):', totalWithdrawn);

    // Calculate frozen balance (pending withdrawals)
    const { data: frozenData, error: frozenError } = await supabase
      .from('withdrawals')
      .select('amount_requested')
      .eq('user_id', profile.id)
      .eq('status', 'pending');

    if (frozenError) {
      console.error('[BALANCE] Error fetching frozen balance:', frozenError);
    }

    const frozenBalance = frozenData?.reduce((sum, w) => sum + w.amount_requested, 0) || 0;
    console.log('[BALANCE] Frozen balance (pending withdrawals):', frozenBalance);

    // Calculate available balance = total commissions - total withdrawn - frozen
    const availableBalance = Math.max(0, totalCommissions - totalWithdrawn - frozenBalance);

    console.log('[BALANCE] Calculated available balance:', availableBalance);

    // Check if affiliate is active (has any earnings)
    const isActiveThisMonth = totalCommissions > 0;

    // Get or create user settings for PIX key
    let { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('pix_key')
      .eq('user_id', profile.id)
      .single();

    let pixKey = null;
    if (settingsError || !settingsData) {
      // Create default settings
      const { error: createSettingsError } = await supabase
        .from('user_settings')
        .insert({
          user_id: profile.id,
          is_active_this_month: isActiveThisMonth,
          available_balance: availableBalance,
          frozen_balance: frozenBalance,
          total_earnings: totalCommissions
        });

      if (createSettingsError) {
        console.error('[BALANCE] Error creating user settings:', createSettingsError);
      }
    } else {
      pixKey = settingsData.pix_key;
      
      // Update user settings with current balance info
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({
          is_active_this_month: isActiveThisMonth,
          available_balance: availableBalance,
          frozen_balance: frozenBalance,
          total_earnings: totalCommissions,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', profile.id);

      if (updateError) {
        console.error('[BALANCE] Error updating user settings:', updateError);
      }
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

// Get network preference
app.get("/api/affiliate/network/preference", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }

  try {
    const supabase = createSupabaseClient(c);
    
    // Get affiliate from session
    const { data: sessionData, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .select(`
        affiliate_id,
        affiliates!inner(id)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single();

    if (sessionError || !sessionData) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionData.affiliates;

    // Get user profile for leg preference from user_profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('mocha_user_id', `affiliate_${affiliate.id}`)
      .single();

    if (profileError || !profileData) {
      return c.json({ preference: 'auto' });
    }

    // Get user settings for leg preference
    const { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('leg_preference')
      .eq('user_id', profileData.id)
      .single();

    if (settingsError || !settingsData) {
      return c.json({ preference: 'auto' });
    }

    const preference = settingsData.leg_preference || 'auto';
    
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
    const supabase = createSupabaseClient(c);
    
    // Get affiliate from session
    const { data: sessionData, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .select(`
        affiliate_id,
        affiliates!inner(id)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single();

    if (sessionError || !sessionData) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionData.affiliates;
    const { preference } = body;

    // Validate preference
    if (!['left', 'right', 'center', 'auto'].includes(preference)) {
      return c.json({ error: "Preferência inválida" }, 400);
    }

    // Convert API format to database format
    const dbPreference = preference === 'auto' ? 'automatic' : preference;

    // Get or create user profile
    let { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('mocha_user_id', `affiliate_${affiliate.id}`)
      .single();

    if (profileError || !profileData) {
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          mocha_user_id: `affiliate_${affiliate.id}`,
          role: 'affiliate',
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user profile:', createError);
        return c.json({ error: "Failed to create user profile" }, 500);
      }
      
      profileData = newProfile;
    }

    // Update or create user settings
    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: profileData.id,
        leg_preference: dbPreference,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Error updating user settings:', upsertError);
      return c.json({ error: "Failed to update network preference" }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating network preference:', error);
    return c.json({ error: "Failed to update network preference" }, 500);
  }
});

// Get affiliate settings
app.get("/api/affiliate/settings", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }
  
  try {
    const supabase = createSupabaseClient(c);
    
    // Get affiliate from session
    const { data: sessionData, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .select(`
        affiliate_id,
        affiliates!inner(id, cpf, full_name, phone)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single();

    if (sessionError || !sessionData) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionData.affiliates;

    // Get or create user profile (consistent with balance endpoint)
    let { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('mocha_user_id', `affiliate_${affiliate.id}`)
      .single();

    if (profileError || !profileData) {
      const { data: upsertedProfile, error: upsertError } = await supabase
        .from('user_profiles')
        .upsert({
          mocha_user_id: `affiliate_${affiliate.id}`,
          cpf: affiliate.cpf || '',
          role: 'affiliate',
          is_active: true
        }, { onConflict: 'mocha_user_id' })
        .select()
        .single();

      if (upsertError) {
        console.error('Error creating/updating user profile:', upsertError);
        return c.json({ error: "Failed to create user profile" }, 500);
      }
      profileData = upsertedProfile;
    }

    // Get or create user settings using profile.id (consistent with balance endpoint)
    let { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', profileData.id)
      .single();

    if (settingsError || !settingsData) {
      // Create default settings using profile.id
      const { data: newSettings, error: createSettingsError } = await supabase
        .from('user_settings')
        .insert({
          user_id: profileData.id,
          leg_preference: 'automatic'
        })
        .select()
        .single();

      if (createSettingsError) {
        console.error('Error creating user settings:', createSettingsError);
        return c.json({ error: "Failed to create user settings" }, 500);
      }
      
      settingsData = newSettings;
    }

    return c.json({
      pix_key: settingsData.pix_key,
      leg_preference: settingsData.leg_preference || 'automatic',
      full_name: affiliate.full_name,
      phone: affiliate.phone
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
    const supabase = createSupabaseClient(c);
    
    // Get affiliate from session
    const { data: sessionData, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .select(`
        affiliate_id,
        affiliates!inner(id, cpf)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single();

    if (sessionError || !sessionData) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionData.affiliates;
    const { full_name, phone, pix_key, leg_preference } = body;

    // Validate leg preference
    if (!['left', 'right', 'automatic'].includes(leg_preference)) {
      return c.json({ error: "Preferência de perna inválida" }, 400);
    }

    // Update affiliate profile data
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        full_name: full_name,
        phone: phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliate.id);

    if (updateError) {
      console.error('Error updating affiliate profile:', updateError);
      return c.json({ error: "Failed to update affiliate profile" }, 500);
    }

    // Get or create user profile
    let { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('mocha_user_id', `affiliate_${affiliate.id}`)
      .single();

    if (profileError || !profileData) {
      const { data: upsertedProfile, error: upsertError } = await supabase
        .from('user_profiles')
        .upsert({
          mocha_user_id: `affiliate_${affiliate.id}`,
          cpf: affiliate.cpf || '',
          role: 'affiliate',
          is_active: true
        }, { onConflict: 'mocha_user_id' })
        .select()
        .single();

      if (upsertError) {
        console.error('Error creating/updating user profile:', upsertError);
        return c.json({ error: "Failed to create user profile" }, 500);
      }
      profileData = upsertedProfile;
    }

    // Update or create user settings
    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: profileData.id,
        pix_key: pix_key,
        leg_preference: leg_preference,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Error updating user settings:', upsertError);
      return c.json({ error: "Failed to update settings" }, 500);
    }

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
    const supabase = createSupabaseClient(c);
    
    // Get affiliate from session
    const { data: sessionData, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .select(`
        affiliate_id,
        affiliates!inner(id)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single();

    if (sessionError || !sessionData) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionData.affiliates;

    // Get user profile to find withdrawals (consistent with other endpoints)
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('mocha_user_id', `affiliate_${affiliate.id}`)
      .single();

    if (profileError || !profileData) {
      return c.json([]);
    }

    // Get real withdrawals from database using profile.id
    const { data: withdrawalData, error: withdrawalError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', profileData.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (withdrawalError) {
      console.error('Error fetching withdrawals:', withdrawalError);
      return c.json({ error: "Failed to fetch withdrawals" }, 500);
    }

    return c.json(withdrawalData || []);
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
    const supabase = createSupabaseClient(c);
    
    // Get affiliate from session
    const { data: sessionData, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .select(`
        affiliate_id,
        affiliates!inner(id)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single();

    if (sessionError || !sessionData) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionData.affiliates;
    const { amount } = body;

    if (!amount || amount <= 0) {
      return c.json({ error: "Valor inválido" }, 400);
    }

    // Check withdrawal date restrictions (only on 10th or 15th of each month)
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    
    if (currentDay !== 10 && currentDay !== 15) {
      return c.json({ 
        error: "Saques só podem ser solicitados nos dias 10 ou 15 de cada mês" 
      }, 400);
    }

    // Check if already made a withdrawal this month
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('mocha_user_id', `affiliate_${affiliate.id}`)
      .single();

    if (profileError || !profileData) {
      return c.json({ error: "Configure suas informações primeiro" }, 400);
    }

    // Check existing withdrawal this month
    const { data: existingWithdrawal, error: existingError } = await supabase
      .from('withdrawals')
      .select('id')
      .eq('user_id', profileData.id)
      .gte('created_at', new Date(currentYear, currentMonth - 1, 1).toISOString())
      .lt('created_at', new Date(currentYear, currentMonth, 1).toISOString())
      .maybeSingle();

    if (existingWithdrawal) {
      return c.json({ 
        error: "Você já solicitou um saque este mês. Saques são limitados a 1 por mês." 
      }, 400);
    }

    // Get user settings using profile.id
    const { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', profileData.id)
      .single();

    if (settingsError || !settingsData) {
      return c.json({ error: "Configure suas informações primeiro" }, 400);
    }

    if (!settingsData.pix_key) {
      return c.json({ error: "Configure sua chave PIX primeiro" }, 400);
    }

    if (!settingsData.is_active_this_month) {
      return c.json({ error: "Você precisa ter feito pelo menos uma compra no mês anterior" }, 400);
    }

    // Calculate net available balance (70% of total earnings - already withdrawn)
    const totalEarnings = settingsData.total_earnings || 0;
    const netAvailableBalance = (totalEarnings * 0.70) - ((settingsData.total_earnings || 0) - (settingsData.available_balance || 0));
    
    if (amount > netAvailableBalance) {
      return c.json({ error: "Saldo insuficiente" }, 400);
    }

    // No additional fees - the 30% was already separated from earnings
    const feeAmount = 0; // No fee on withdrawal
    const netAmount = amount; // User receives full requested amount

    // Create real withdrawal in database
    const { data: withdrawalData, error: withdrawalError } = await supabase
      .from('withdrawals')
      .insert({
        user_id: profileData.id,
        amount_requested: amount,
        fee_amount: feeAmount,
        net_amount: netAmount,
        status: 'pending',
        pix_key: settingsData.pix_key,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (withdrawalError || !withdrawalData) {
      console.error('Error creating withdrawal:', withdrawalError);
      return c.json({ error: "Erro ao criar solicitação de saque" }, 500);
    }

    // Update user balance (freeze the requested amount)
    const { error: updateError } = await supabase
      .from('user_settings')
      .update({
        available_balance: settingsData.available_balance - amount,
        frozen_balance: settingsData.frozen_balance + amount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', profileData.id);

    if (updateError) {
      console.error('Error updating user balance:', updateError);
      return c.json({ error: "Erro ao atualizar saldo" }, 500);
    }

    return c.json({ 
      success: true,
      withdrawal: {
        id: withdrawalData.id,
        amount_requested: amount,
        fee_amount: feeAmount,
        net_amount: netAmount,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    return c.json({ error: "Failed to create withdrawal request" }, 500);
  }
});

// Update affiliate profile
app.post("/api/affiliate/profile", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');
  const body = await c.req.json();

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }

  try {
    const supabase = createSupabaseClient(c);
    
    // Get affiliate from session
    const { data: sessionData, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .select(`
        affiliate_id,
        affiliates!inner(id)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single();

    if (sessionError || !sessionData) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionData.affiliates;
    const { full_name, whatsapp } = body;

    // Update affiliate profile
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({
        full_name: full_name,
        phone: whatsapp,
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliate.id);

    if (updateError) {
      console.error('Error updating affiliate profile:', updateError);
      return c.json({ error: "Erro ao atualizar perfil" }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating affiliate profile:', error);
    return c.json({ error: "Erro ao atualizar perfil" }, 500);
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
    const supabase = createSupabaseClient(c);
    
    // Get affiliate from session
    const { data: sessionData, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .select(`
        affiliate_id,
        affiliates!inner(id, full_name, email, cpf, created_at, last_access_at)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single();

    if (sessionError || !sessionData) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionData.affiliates;

    // Helper function to recursively build network tree
    const buildNetworkTree = async (affiliateId: string, currentLevel: number): Promise<any> => {
      if (currentLevel > maxDepth) {
        return null;
      }

      // Get this affiliate's information
      const { data: affiliateInfo, error: infoError } = await supabase
        .from('affiliates')
        .select('id, full_name, email, cpf, created_at, last_access_at, is_active')
        .eq('id', affiliateId)
        .eq('is_active', true)
        .single();

      if (infoError || !affiliateInfo) {
        return null;
      }

      // Get direct referrals (children)
      const { data: childrenResults, error: childrenError } = await supabase
        .from('affiliates')
        .select('id, full_name, email, cpf, created_at, last_access_at, is_active')
        .eq('sponsor_id', affiliateId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (childrenError) {
        console.error('Error fetching children:', childrenError);
      }

      // Count direct referrals
      const directReferrals = childrenResults?.length || 0;

      // Check if active (accessed in last 30 days)
      const isActive = affiliateInfo.last_access_at ? 
        new Date(affiliateInfo.last_access_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : 
        false;

      // Build node
      const node = {
        id: affiliateInfo.id.toString(),
        name: affiliateInfo.full_name || affiliateInfo.email?.split('@')[0] || 'Afiliado',
        email: affiliateInfo.email,
        coupon: affiliateInfo.cpf || 'N/A',
        active: isActive,
        level: currentLevel,
        cpf: affiliateInfo.cpf || 'N/A',
        direct_referrals: directReferrals,
        signup_date: affiliateInfo.created_at,
        children: [] as any[]
      };

      // Recursively build children
      if (currentLevel < maxDepth && childrenResults && childrenResults.length > 0) {
        for (const child of childrenResults) {
          const childNode = await buildNetworkTree(child.id.toString(), currentLevel + 1);
          if (childNode) {
            node.children.push(childNode);
          }
        }
      }

      return node;
    };

    // Build tree starting from current affiliate
    const tree = await buildNetworkTree(affiliate.id.toString(), 0);

    return c.json(tree);
  } catch (error) {
    console.error('Error fetching network tree:', error);
    return c.json({ error: "Failed to fetch network tree" }, 500);
  }
});

// Get current affiliate (authentication check)
app.get("/api/affiliate/me", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');

  console.log('[AFFILIATE_ME] Session token from cookie:', sessionToken);
  console.log('[AFFILIATE_ME] All cookies:', c.req.header('cookie'));

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }

  try {
    const supabase = createSupabaseClient(c);
    
    // Get affiliate from session using Supabase
    const { data: sessionData, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .select(`
        affiliate_id,
        affiliates!inner(
          id, 
          full_name, 
          cpf, 
          email, 
          phone, 
          referral_code, 
          sponsor_id, 
          is_verified, 
          created_at,
          last_access_at
        )
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single();

    console.log('[AFFILIATE_ME] Session lookup result:', { sessionData, sessionError });

    if (sessionError || !sessionData) {
      console.log('[AFFILIATE_ME] Session lookup failed:', sessionError);
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionData.affiliates;

    // Update last access time
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({ 
        last_access_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliate.id);

    if (updateError) {
      console.error('Error updating last access time:', updateError);
    }

    // Use CPF as customer coupon for simplicity and uniqueness
    const customerCoupon = affiliate.cpf;

    return c.json({
      id: affiliate.id,
      full_name: affiliate.full_name,
      cpf: affiliate.cpf,
      email: affiliate.email,
      whatsapp: affiliate.phone, // Use phone as whatsapp
      referral_code: affiliate.referral_code,
      customer_coupon: customerCoupon,
      sponsor_id: affiliate.sponsor_id,
      is_verified: Boolean(affiliate.is_verified),
      created_at: affiliate.created_at,
      last_access_at: affiliate.last_access_at
    });
  } catch (error) {
    console.error('Get affiliate error:', error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

export default app;