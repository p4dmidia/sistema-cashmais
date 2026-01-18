// supabase/functions/api/index.ts
import { Hono } from 'https://deno.land/x/hono@v3.7.4/mod.ts'
import { cors } from 'https://deno.land/x/hono@v3.7.4/middleware.ts'
import { getCookie, setCookie } from 'https://deno.land/x/hono@v3.7.4/helper/cookie/index.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3'
import { z } from 'https://esm.sh/zod@3.24.3'

const app = new Hono()

function createSupabase() {
  const url = Deno.env.get('SUPABASE_URL') || ''
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  return createClient(url, key)
}

async function releaseBlockedIfQualified(client: any, affiliateId: number) {
  const { count } = await client
    .from('affiliates')
    .select('id', { count: 'exact', head: true })
    .eq('sponsor_id', affiliateId)
    .eq('is_active', true)
  if (!count || count < 3) return
  const { data: profile } = await client
    .from('user_profiles')
    .select('id')
    .eq('mocha_user_id', `affiliate_${affiliateId}`)
    .single()
  let profileId = (profile as any)?.id
  if (!profileId) {
    const { data: created } = await client
      .from('user_profiles')
      .insert({ mocha_user_id: `affiliate_${affiliateId}`, role: 'affiliate', is_active: true })
      .select('id')
      .single()
    profileId = (created as any)?.id
  }
  if (!profileId) return
  let sumBlocked = 0
  try {
    const { data: blockedRows } = await client
      .from('commission_distributions')
      .select('commission_amount, is_blocked')
      .eq('affiliate_id', affiliateId)
      .eq('is_blocked', true)
    sumBlocked = (blockedRows || []).reduce((s: number, r: any) => s + Number(r.commission_amount || 0), 0)
  } catch {
    const { data: settingsRow2 } = await client
      .from('user_settings')
      .select('frozen_balance')
      .eq('user_id', profileId)
      .single()
    sumBlocked = Number((settingsRow2 as any)?.frozen_balance || 0)
  }
  if (sumBlocked <= 0) return
  const { data: settingsRow } = await client
    .from('user_settings')
    .select('id, available_balance, frozen_balance')
    .eq('user_id', profileId)
    .single()
  const currentAvail = Number((settingsRow as any)?.available_balance || 0)
  const currentFrozen = Number((settingsRow as any)?.frozen_balance || 0)
  const newAvail = currentAvail + sumBlocked
  const newFrozen = Math.max(0, currentFrozen - sumBlocked)
  if (settingsRow) {
    await client
      .from('user_settings')
      .update({ available_balance: newAvail, frozen_balance: newFrozen, is_active_this_month: true, updated_at: new Date().toISOString() })
      .eq('id', (settingsRow as any).id)
  } else {
    await client
      .from('user_settings')
      .insert({ user_id: profileId, total_earnings: sumBlocked, available_balance: newAvail, frozen_balance: newFrozen, is_active_this_month: true, updated_at: new Date().toISOString() })
  }
  try {
    await client
      .from('commission_distributions')
      .update({ is_blocked: false, released_at: new Date().toISOString() })
      .eq('affiliate_id', affiliateId)
      .eq('is_blocked', true)
  } catch {}
}

async function getCommissionSettingsSupabase(client: any) {
  const { data } = await client
    .from('system_commission_settings')
    .select('level, percentage')
    .eq('is_active', true)
    .order('level', { ascending: true })
  if (Array.isArray(data) && data.length) return data.map((s: any) => ({ level: s.level as number, percentage: s.percentage as number }))
  return Array.from({ length: 10 }, (_, i) => ({ level: i + 1, percentage: 10 }))
}

async function hasMinimumReferralsSupabase(client: any, affiliateId: number) {
  const { count } = await client
    .from('affiliates')
    .select('id', { count: 'exact', head: true })
    .eq('sponsor_id', affiliateId)
    .eq('is_active', true)
  return (count || 0) >= 3
}

async function getAffiliateSponsorSupabase(client: any, affiliateId: number) {
  const { data } = await client
    .from('affiliates')
    .select('sponsor_id')
    .eq('id', affiliateId)
    .single()
  return (data as any)?.sponsor_id || null
}

async function getOrCreateAffiliateProfileSupabase(client: any, affiliateId: number) {
  const mochaUserId = `affiliate_${affiliateId}`
  const { data: profile } = await client
    .from('user_profiles')
    .select('id')
    .eq('mocha_user_id', mochaUserId)
    .maybeSingle()
  if (profile?.id) return profile
  const { data: newProfile } = await client
    .from('user_profiles')
    .upsert({ mocha_user_id: mochaUserId, role: 'affiliate', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'mocha_user_id' })
    .select('id')
    .single()
  return newProfile || null
}

async function ensureUserProfileExists(client: any, affiliateId: number, cpf: string): Promise<number | null> {
  const mochaUserId = `affiliate_${affiliateId}`
  const { data: byMocha } = await client
    .from('user_profiles')
    .select('id, mocha_user_id, cpf')
    .eq('mocha_user_id', mochaUserId)
    .maybeSingle()
  if ((byMocha as any)?.id) return (byMocha as any).id as number
  const cleanCpf = String(cpf || '').replace(/\D/g, '')
  const { data: byCpf } = await client
    .from('user_profiles')
    .select('id, mocha_user_id, cpf')
    .eq('cpf', cleanCpf)
    .maybeSingle()
  if ((byCpf as any)?.id) {
    const pid = (byCpf as any).id
    await client
      .from('user_profiles')
      .update({ mocha_user_id: mochaUserId, role: 'affiliate', is_active: true, updated_at: new Date().toISOString() })
      .eq('id', pid)
    return pid as number
  }
  const { data: created } = await client
    .from('user_profiles')
    .insert({ mocha_user_id: mochaUserId, cpf: cleanCpf, role: 'affiliate', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .select('id')
    .single()
  return ((created as any)?.id ?? null) as number | null
}

async function ensureProfileExists(client: any, cpf: string, affiliateId: number): Promise<number | null> {
  return await ensureUserProfileExists(client, affiliateId, cpf)
}

async function recordCommissionSupabase(client: any, purchaseId: number, affiliateId: number, level: number, commissionAmount: number, commissionPercentage: number, baseCashback: number, isBlocked: boolean) {
  const payload: any = { purchase_id: purchaseId, affiliate_id: affiliateId, level, commission_amount: commissionAmount, commission_percentage: commissionPercentage, base_cashback: baseCashback, created_at: new Date().toISOString() }
  if (typeof isBlocked === 'boolean') payload.is_blocked = isBlocked
  const { error } = await client.from('commission_distributions').insert(payload)
  if (error && String(error.message || '').toLowerCase().includes('is_blocked')) {
    const { error: fb } = await client.from('commission_distributions').insert({ purchase_id: purchaseId, affiliate_id: affiliateId, level, commission_amount: commissionAmount, commission_percentage: commissionPercentage, base_cashback: baseCashback, created_at: new Date().toISOString() })
    if (fb) return false
    return true
  }
  return !error
}

async function updateEarningsSupabase(client: any, userId: number, commissionAmount: number, isBlocked: boolean) {
  const { error } = await client
    .from('user_settings')
    .upsert({ user_id: userId, total_earnings: commissionAmount, available_balance: isBlocked ? 0 : commissionAmount, frozen_balance: isBlocked ? commissionAmount : 0, is_active_this_month: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  return !error
}

async function distributeNetworkCommissionsSupabase(client: any, purchaseId: number, customerType: 'affiliate' | 'user', customerId: number, baseCashback: number) {
  if (customerType !== 'affiliate') return
  const { data: customer } = await client
    .from('affiliates')
    .select('id, sponsor_id')
    .eq('id', customerId)
    .eq('is_active', true)
    .single()
  if (!customer) return
  const settings = await getCommissionSettingsSupabase(client)
  const totalDistributable = baseCashback * 0.70
  let totalDistributed = 0
  let currentAffiliateId: number | null = customerId
  let currentLevel = 0
  while (currentAffiliateId && currentLevel < 10) {
    const settingsLevel = currentLevel === 0 ? 1 : currentLevel
    const lvl = settings.find((s: any) => s.level === settingsLevel) || { level: settingsLevel, percentage: 10 }
    const qualifies = currentLevel <= 1 ? true : await hasMinimumReferralsSupabase(client, currentAffiliateId)
    const amount = totalDistributable * ((lvl.percentage as number) / 100)
    totalDistributed += amount
    await recordCommissionSupabase(client, purchaseId, currentAffiliateId, currentLevel, amount, lvl.percentage as number, baseCashback, !qualifies)
    const profile = await getOrCreateAffiliateProfileSupabase(client, currentAffiliateId)
    if (profile?.id) await updateEarningsSupabase(client, profile.id, amount, !qualifies)
    currentAffiliateId = currentLevel === 0 ? (customer as any).sponsor_id : await getAffiliateSponsorSupabase(client, currentAffiliateId)
    currentLevel++
    if (!currentAffiliateId) break
  }
  const undistributed = totalDistributable - totalDistributed
  const finalCashmaisShare = baseCashback * 0.30 + undistributed
  await client.from('commission_distributions').insert({ purchase_id: purchaseId, affiliate_id: 0, level: 999, commission_amount: finalCashmaisShare, commission_percentage: 0, base_cashback: baseCashback, created_at: new Date().toISOString() })
}

app.use('*', cors({
  origin: (origin) => origin || '*',
  allowHeaders: ['Authorization', 'Content-Type', 'X-Client-Info', 'Cookie'],
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

app.get('/health', (c) => c.json({ ok: true }))
app.get('/api/health', (c) => c.json({ ok: true }))

const AdminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})

app.post('/admin/login', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = AdminLoginSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Dados inválidos' }, 400)
    const { username, password } = parsed.data
    const supabase = createSupabase()
    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('id, username, email, full_name, password_hash, is_active')
      .eq('username', username)
      .eq('is_active', true)
      .single()
    if (error || !adminUser) return c.json({ error: 'Usuário não encontrado' }, 404)
    const ok = await bcrypt.compare(password, (adminUser as any).password_hash)
    if (!ok) return c.json({ error: 'Credenciais inválidas' }, 401)
    const sessionToken = crypto.randomUUID() + '-' + Date.now()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { error: sessErr } = await supabase
      .from('admin_sessions')
      .insert({ admin_user_id: (adminUser as any).id, session_token: sessionToken, expires_at: expiresAt })
    if (sessErr) return c.json({ error: 'Erro interno do servidor' }, 500)
    setCookie(c, 'admin_session', sessionToken, { httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 24 * 60 * 60, path: '/' })
    await supabase
      .from('admin_audit_logs')
      .insert({ admin_user_id: (adminUser as any).id, action: 'LOGIN', entity_type: 'admin_session' })
    return c.json({ success: true, admin: { id: (adminUser as any).id, username: (adminUser as any).username, email: (adminUser as any).email, full_name: (adminUser as any).full_name } })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.post('/api/admin/login', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = AdminLoginSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Dados inválidos' }, 400)
    const { username, password } = parsed.data
    const supabase = createSupabase()
    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('id, username, email, full_name, password_hash, is_active')
      .eq('username', username)
      .eq('is_active', true)
      .single()
    if (error || !adminUser) return c.json({ error: 'Usuário não encontrado' }, 404)
    const ok = await bcrypt.compare(password, (adminUser as any).password_hash)
    if (!ok) return c.json({ error: 'Credenciais inválidas' }, 401)
    const sessionToken = crypto.randomUUID() + '-' + Date.now()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { error: sessErr } = await supabase
      .from('admin_sessions')
      .insert({ admin_user_id: (adminUser as any).id, session_token: sessionToken, expires_at: expiresAt })
    if (sessErr) return c.json({ error: 'Erro interno do servidor' }, 500)
    setCookie(c, 'admin_session', sessionToken, { httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 24 * 60 * 60, path: '/' })
    await supabase
      .from('admin_audit_logs')
      .insert({ admin_user_id: (adminUser as any).id, action: 'LOGIN', entity_type: 'admin_session' })
    return c.json({ success: true, token: sessionToken, admin: { id: (adminUser as any).id, username: (adminUser as any).username, email: (adminUser as any).email, full_name: (adminUser as any).full_name } })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

const AdminCreateSchema = z.object({ username: z.string().min(1), password: z.string().min(6), email: z.string().email().optional(), full_name: z.string().optional() })

app.post('/api/admin/create', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = AdminCreateSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Dados inválidos' }, 400)
    const supabase = createSupabase()
    const hash = await bcrypt.hash(parsed.data.password, 12)
    const { error: upErr } = await supabase
      .from('admin_users')
      .upsert({ username: parsed.data.username, email: parsed.data.email || 'admin@cashmais.com', full_name: parsed.data.full_name || 'Administrador', password_hash: hash, is_active: true }, { onConflict: 'username' })
    if (upErr) return c.json({ error: 'Erro interno do servidor' }, 500)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/admin/me', async (c) => {
  try {
    const token = getCookie(c, 'admin_session')
    if (!token) return c.json({ error: 'Não autenticado' }, 401)
    const supabase = createSupabase()
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('*, admin_users!inner(username,email,full_name,is_active)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!session) return c.json({ error: 'Sessão inválida' }, 401)
    return c.json({ admin: { id: (session as any).admin_user_id, username: (session as any).admin_users.username, email: (session as any).admin_users.email, full_name: (session as any).admin_users.full_name } })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/admin/me', async (c) => {
  try {
    const cookieToken = getCookie(c, 'admin_session')
    const authHeader = c.req.header('authorization') || ''
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''
    const token = cookieToken || bearerToken
    if (!token) return c.json({ error: 'Não autenticado' }, 401)
    const supabase = createSupabase()
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('*, admin_users!inner(username,email,full_name,is_active)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!session) return c.json({ error: 'Sessão inválida' }, 401)
    return c.json({ admin: { id: (session as any).admin_user_id, username: (session as any).admin_users.username, email: (session as any).admin_users.email, full_name: (session as any).admin_users.full_name } })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.post('/admin/logout', async (c) => {
  try {
    const token = getCookie(c, 'admin_session')
    const supabase = createSupabase()
    if (token) await supabase.from('admin_sessions').delete().eq('session_token', token)
    setCookie(c, 'admin_session', '', { httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 0, path: '/' })
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.post('/api/admin/logout', async (c) => {
  try {
    const token = getCookie(c, 'admin_session')
    const supabase = createSupabase()
    if (token) await supabase.from('admin_sessions').delete().eq('session_token', token)
    setCookie(c, 'admin_session', '', { httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 0, path: '/' })
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/admin/dashboard/stats', async (c) => {
  try {
    const supabase = createSupabase()
    const { count: totalAffiliates } = await supabase.from('affiliates').select('*', { count: 'exact', head: true }).eq('is_active', true)
    const { count: totalCompanies } = await supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_active', true)
    const { data: pendingWithdrawals } = await supabase.from('withdrawals').select('amount_requested').eq('status', 'pending')
    const pendingAmount = (pendingWithdrawals || []).reduce((s: number, w: any) => s + Number(w.amount_requested || 0), 0)
    const pendingCount = pendingWithdrawals?.length || 0
    const now = new Date(), year = now.getFullYear(), month = String(now.getMonth() + 1).padStart(2, '0')
    const { data: cbRows } = await supabase
      .from('company_purchases')
      .select('cashback_generated')
      .gte('purchase_date', `${year}-${month}-01`)
      .lt('purchase_date', new Date(year, now.getMonth() + 1, 1).toISOString().split('T')[0])
    const cashbackThisMonth = (cbRows || []).reduce((s: number, r: any) => s + Number(r.cashback_generated || 0), 0)
    return c.json({ stats: { totalAffiliates: totalAffiliates || 0, totalCompanies: totalCompanies || 0, pendingWithdrawals: { count: pendingCount, totalAmount: pendingAmount }, cashbackThisMonth } })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/admin/dashboard/stats', async (c) => {
  try {
    const supabase = createSupabase()
    const { count: totalAffiliates } = await supabase.from('affiliates').select('*', { count: 'exact', head: true }).eq('is_active', true)
    const { count: totalCompanies } = await supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_active', true)
    const { data: pendingWithdrawals } = await supabase.from('withdrawals').select('amount_requested').eq('status', 'pending')
    const pendingAmount = (pendingWithdrawals || []).reduce((s: number, w: any) => s + Number(w.amount_requested || 0), 0)
    const pendingCount = pendingWithdrawals?.length || 0
    const now = new Date(), year = now.getFullYear(), month = String(now.getMonth() + 1).padStart(2, '0')
    const startMonth = `${year}-${month}-01`
    const nextMonth = new Date(year, now.getMonth() + 1, 1).toISOString().split('T')[0]
    const { data: pRows } = await supabase
      .from('company_purchases')
      .select('id, company_id, purchase_value, cashback_generated, purchase_date, customer_coupon, companies!inner(nome_fantasia)')
      .gte('purchase_date', startMonth)
      .lt('purchase_date', nextMonth)
      .order('purchase_date', { ascending: false })
    const cashbackThisMonth = (pRows || []).reduce((s: number, r: any) => s + Number(r.cashback_generated || 0), 0)
    const recentPurchases = (pRows || []).slice(0, 10).map((r: any) => ({ id: r.id, company_name: r.companies?.nome_fantasia || '', customer_cpf: r.customer_coupon || '', purchase_value: Number(r.purchase_value || 0), cashback_generated: Number(r.cashback_generated || 0), purchase_date: r.purchase_date }))
    let affiliatesCommissionsMonth = 0
    let companyReceivableMonth = 0
    try {
      const { data: distRows } = await supabase
        .from('commission_distributions')
        .select('commission_amount, level, affiliate_id, created_at')
        .gte('created_at', startMonth)
        .lt('created_at', nextMonth)
      for (const r of distRows || []) {
        const amt = Number((r as any).commission_amount || 0)
        const lvl = Number((r as any).level || 0)
        const aid = String((r as any).affiliate_id || '')
        if (lvl === 999 || aid === '0') companyReceivableMonth += amt
        else affiliatesCommissionsMonth += amt
      }
    } catch {}
    return c.json({ stats: { totalAffiliates: totalAffiliates || 0, totalCompanies: totalCompanies || 0, pendingWithdrawals: { count: pendingCount, totalAmount: pendingAmount }, cashbackThisMonth, affiliatesCommissionsMonth, companyReceivableMonth }, recentPurchases })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/admin/companies', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const search = c.req.query('search') || ''
    const offset = (page - 1) * limit
    const supabase = createSupabase()
    let select = supabase
      .from('companies')
      .select('id,nome_fantasia,razao_social,cnpj,email,telefone,responsavel,is_active,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (search) select = select.or(`nome_fantasia.ilike.%${search}%,razao_social.ilike.%${search}%,cnpj.ilike.%${search}%,email.ilike.%${search}%`)
    const { data: companies, count } = await select.range(offset, offset + limit - 1)
    const enhanced = [] as any[]
    for (const company of companies || []) {
      const { data: cashbackConfig } = await supabase.from('company_cashback_config').select('cashback_percentage').eq('company_id', (company as any).id).single()
      const { count: totalPurchases } = await supabase.from('company_purchases').select('id', { count: 'exact', head: true }).eq('company_id', (company as any).id)
      const { data: sumRow } = await supabase.from('company_purchases').select('sum(cashback_generated)').eq('company_id', (company as any).id).single()
      enhanced.push({ ...company, cashback_percentage: (cashbackConfig as any)?.cashback_percentage ?? 5.0, total_purchases: totalPurchases || 0, total_cashback_generated: (sumRow as any)?.sum ?? 0 })
    }
    return c.json({ companies: enhanced, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/admin/companies', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const search = c.req.query('search') || ''
    const offset = (page - 1) * limit
    const supabase = createSupabase()
    let select = supabase
      .from('companies')
      .select('id,nome_fantasia,razao_social,cnpj,email,telefone,responsavel,is_active,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (search) select = select.or(`nome_fantasia.ilike.%${search}%,razao_social.ilike.%${search}%,cnpj.ilike.%${search}%,email.ilike.%${search}%`)
    const { data: companies, count } = await select.range(offset, offset + limit - 1)
    const enhanced = [] as any[]
    for (const company of companies || []) {
      const { data: cashbackConfig } = await supabase.from('company_cashback_config').select('cashback_percentage').eq('company_id', (company as any).id).single()
      const { count: totalPurchases } = await supabase.from('company_purchases').select('id', { count: 'exact', head: true }).eq('company_id', (company as any).id)
      const { data: sumRow } = await supabase.from('company_purchases').select('sum(cashback_generated)').eq('company_id', (company as any).id).single()
      enhanced.push({ ...company, cashback_percentage: (cashbackConfig as any)?.cashback_percentage ?? 5.0, total_purchases: totalPurchases || 0, total_cashback_generated: (sumRow as any)?.sum ?? 0 })
    }
    return c.json({ companies: enhanced, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/admin/companies/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const supabase = createSupabase()
    const { data: company } = await supabase
      .from('companies')
      .select('id, nome_fantasia, razao_social, cnpj, email, telefone, responsavel, is_active, created_at')
      .eq('id', id)
      .single()
    if (!company) return c.json({ error: 'Empresa não encontrada' }, 404)
    const { data: cfg } = await supabase
      .from('company_cashback_config')
      .select('cashback_percentage')
      .eq('company_id', (company as any).id)
      .single()
    const { count: totalPurchases } = await supabase
      .from('company_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', (company as any).id)
    const { data: sumRow } = await supabase
      .from('company_purchases')
      .select('id, purchase_value, cashback_generated, purchase_date, customer_coupon')
      .eq('company_id', (company as any).id)
      .order('purchase_date', { ascending: false })

    const recentPurchases = (sumRow || []).slice(0, 10).map((r: any) => ({
      id: r.id,
      purchase_date: r.purchase_date,
      purchase_value: Number(r.purchase_value || 0),
      cashback_generated: Number(r.cashback_generated || 0),
      customer_coupon: r.customer_coupon || ''
    }))

    const { data: totalsRow } = await supabase
      .from('company_purchases')
      .select('sum(purchase_value), sum(cashback_generated)')
      .eq('company_id', (company as any).id)
      .single()

    return c.json({
      company: {
        id: (company as any).id,
        nome_fantasia: (company as any).nome_fantasia,
        razao_social: (company as any).razao_social,
        cnpj: (company as any).cnpj,
        email: (company as any).email,
        telefone: (company as any).telefone,
        responsavel: (company as any).responsavel,
        is_active: Boolean((company as any).is_active),
        created_at: (company as any).created_at,
      },
      metrics: {
        cashback_percentage: (cfg as any)?.cashback_percentage ?? 5.0,
        total_purchases: totalPurchases || 0,
        total_cashback_generated: (totalsRow as any)?.sum?.cashback_generated || 0,
      },
      recentPurchases,
    })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.patch('/api/admin/companies/:id/toggle-status', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const supabase = createSupabase()
    const { data: comp } = await supabase
      .from('companies')
      .select('id, is_active')
      .eq('id', id)
      .single()
    if (!comp) return c.json({ error: 'Empresa não encontrada' }, 404)
    const newStatus = !(comp as any).is_active
    const { error } = await supabase
      .from('companies')
      .update({ is_active: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return c.json({ error: 'Erro interno do servidor' }, 500)
    if (!newStatus) {
      const { data: cashiers } = await supabase
        .from('company_cashiers')
        .select('id')
        .eq('company_id', id)
      const cashierIds = (cashiers || []).map((cx: any) => cx.id)
      if (cashierIds.length > 0) await supabase.from('cashier_sessions').delete().in('cashier_id', cashierIds)
      await supabase.from('company_cashiers').update({ is_active: false }).eq('company_id', id)
    }
    return c.json({ success: true, newStatus })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/admin/withdrawals', async (c) => {
  try {
    const status = c.req.query('status') || 'pending'
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = (page - 1) * limit
    const supabase = createSupabase()
    const { data: rows, count } = await supabase
      .from('withdrawals')
      .select('id, amount_requested, fee_amount, net_amount, status, pix_key, created_at, affiliate_id, affiliates(full_name,cpf,email)', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    const items = (rows || []).map((w: any) => ({ id: w.id, amount_requested: Number(w.amount_requested || 0), fee_amount: Number(w.fee_amount || 0), net_amount: Number(w.net_amount || 0), status: w.status, pix_key: w.pix_key || '', created_at: w.created_at, full_name: w.affiliates?.full_name || 'N/A', cpf: w.affiliates?.cpf || 'N/A', email: w.affiliates?.email || 'N/A' }))
    return c.json({ withdrawals: items, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/admin/withdrawals', async (c) => {
  try {
    const status = c.req.query('status') || 'pending'
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = (page - 1) * limit
    const supabase = createSupabase()
    const { data: rows, count } = await supabase
      .from('withdrawals')
      .select('id, amount_requested, fee_amount, net_amount, status, pix_key, created_at, affiliate_id, affiliates(full_name,cpf,email)', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    const items = (rows || []).map((w: any) => ({ id: w.id, amount_requested: Number(w.amount_requested || 0), fee_amount: Number(w.fee_amount || 0), net_amount: Number(w.net_amount || 0), status: w.status, pix_key: w.pix_key || '', created_at: w.created_at, full_name: w.affiliates?.full_name || 'N/A', cpf: w.affiliates?.cpf || 'N/A', email: w.affiliates?.email || 'N/A' }))
    return c.json({ withdrawals: items, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

const UpdateWithdrawalSchema = z.object({ status: z.enum(['approved', 'rejected']), notes: z.string().optional() })

app.patch('/admin/withdrawals/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const parsed = UpdateWithdrawalSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Dados inválidos', details: parsed.error.errors }, 400)
    const supabase = createSupabase()
    const { data: withdrawal } = await supabase.from('withdrawals').select('*').eq('id', id).single()
    if (!withdrawal) return c.json({ error: 'Saque não encontrado' }, 404)
    if ((withdrawal as any).status !== 'pending') return c.json({ error: 'Saque já foi processado' }, 400)
    const { error: updErr } = await supabase.from('withdrawals').update({ status: parsed.data.status, processed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id)
    if (updErr) return c.json({ error: 'Erro interno do servidor' }, 500)
    return c.json({ success: true, message: `Saque ${parsed.data.status === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso` })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.patch('/api/admin/withdrawals/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    const body = await c.req.json()
    const parsed = UpdateWithdrawalSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Dados inválidos', details: parsed.error.errors }, 400)
    const supabase = createSupabase()
    const { data: withdrawal } = await supabase.from('withdrawals').select('*').eq('id', id).single()
    if (!withdrawal) return c.json({ error: 'Saque não encontrado' }, 404)
    if ((withdrawal as any).status !== 'pending') return c.json({ error: 'Saque já foi processado' }, 400)
    const { error: updErr } = await supabase.from('withdrawals').update({ status: parsed.data.status, processed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id)
    if (updErr) return c.json({ error: 'Erro interno do servidor' }, 500)
    return c.json({ success: true, message: `Saque ${parsed.data.status === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso` })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/admin/reports/companies', async (c) => {
  try {
    const supabase = createSupabase()
    const { data } = await supabase.from('companies').select('id,nome_fantasia').order('nome_fantasia', { ascending: true })
    return c.json({ companies: data || [] })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/admin/reports/companies', async (c) => {
  try {
    const supabase = createSupabase()
    const { data } = await supabase.from('companies').select('id,nome_fantasia').order('nome_fantasia', { ascending: true })
    return c.json({ companies: data || [] })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/health', async (c) => {
  return c.json({ status: 'ok', time: new Date().toISOString() })
})
app.get('/api/debug-vars', async (c) => {
  const envGet = (n: string) => (typeof Deno !== 'undefined' && (Deno as any).env && (Deno as any).env.get ? (Deno as any).env.get(n) : undefined)
  const toState = (v: string | undefined) => (v ? 'defined' : 'undefined')
  return c.json({
    SUPABASE_URL: toState(envGet('SUPABASE_URL')),
    VITE_SUPABASE_URL: toState(envGet('VITE_SUPABASE_URL')),
    DATABASE_URL: toState(envGet('DATABASE_URL')),
    NEXT_PUBLIC_SUPABASE_URL: toState(envGet('NEXT_PUBLIC_SUPABASE_URL')),
    time: new Date().toISOString(),
  })
})
app.post('/api/admin/invoices/generate', async (c) => {
  // 1. Verifica Permissão (Admin)
  const token = getCookie(c, 'admin_session')
  if (!token) return c.json({ error: 'Não autenticado' }, 401)
  try {
    const body = await c.req.json()
    const { company_id, amount, due_date } = body as any
    if (!company_id || !amount) return c.json({ error: 'Dados incompletos' }, 400)
    const supabase = createSupabase()
    // 2. Busca dados da Empresa e Endereço
    const searchId = Number(company_id)
    console.log(`>>> Buscando Empresa ID: ${searchId} (Original: ${company_id})`)
    const { data: company, error: searchError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', searchId)
      .maybeSingle()
    if (!company) {
      console.error('>>> Erro na busca:', searchError)
      return c.json({ error: 'Empresa não encontrada no banco', debug_id: searchId, db_error: searchError }, 404)
    }
    // 3. Validação Rigorosa de Endereço (PagBank exige)
    if (!(company as any).address_street || !(company as any).address_city || !(company as any).address_state || !(company as any).address_zip) {
      return c.json({
        error: 'Endereço incompleto. Atualize o cadastro da empresa.',
        missing_fields: {
          rua: !(company as any).address_street,
          cidade: !(company as any).address_city,
          estado: !(company as any).address_state,
          cep: !(company as any).address_zip,
        },
      }, 400)
    }
    // 4. Monta Payload do PagBank
    const pagbankToken = Deno.env.get('PAGBANK_TOKEN')
    if (!pagbankToken) return c.json({ error: 'Erro de configuração: Token PagBank ausente' }, 500)
    // Formata telefone
    const rawPhone = String((company as any).telefone || '').replace(/\D/g, '')
    const area = rawPhone.substring(0, 2)
    const number = rawPhone.substring(2)
    // Formata CPF/CNPJ
    const taxId = String((company as any).cnpj || '').replace(/\D/g, '')
    const payload = {
      reference_id: `inv_${company_id}_${Date.now()}`,
      customer: {
        name: (company as any).nome_fantasia,
        email: (company as any).email,
        tax_id: taxId,
        phones: [
          {
            country: '55',
            area,
            number,
            type: 'MOBILE',
          },
        ],
      },
      items: [
        {
          reference_id: 'comissao_cashback',
          name: 'Comissoes Cashmais',
          quantity: 1,
          unit_amount: Math.round(Number(amount) * 100),
        },
      ],
      shipping: {
        address: {
          street: (company as any).address_street,
          number: (company as any).address_number || 'S/N',
          complement: 'Comercial',
          locality: (company as any).address_district || 'Centro',
          city: (company as any).address_city,
          region_code: (company as any).address_state,
          country: 'BRA',
          postal_code: String((company as any).address_zip || '').replace(/\D/g, ''),
        },
      },
      charges: [
        {
          reference_id: `chg_${company_id}_${Date.now()}`,
          description: 'Pagamento de Comissoes',
          amount: { value: Math.round(Number(amount) * 100), currency: 'BRL' },
          payment_method: {
            type: 'BOLETO',
            boleto: {
              due_date: (due_date as any) || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
              instruction_lines: {
                line_1: 'Pagamento referente a comissões de cashback',
                line_2: 'Não receber após o vencimento',
              },
              holder: {
                name: (company as any).nome_fantasia,
                tax_id: taxId,
                email: (company as any).email,
                address: {
                  street: (company as any).address_street,
                  number: (company as any).address_number || 'S/N',
                  locality: (company as any).address_district || 'Centro',
                  city: (company as any).address_city,
                  region: (company as any).address_state,
                  country: 'BRA',
                  postal_code: String((company as any).address_zip || '').replace(/\D/g, ''),
                },
              },
            },
          },
        },
      ],
    }
    // --- FORÇANDO PRODUÇÃO ---
    const url = 'https://api.pagseguro.com/orders'
    console.log('>>> MODO PRODUÇÃO ATIVO: Enviando para api.pagseguro.com')
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pagbankToken}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const result = await response.json()
    if (!response.ok) {
      return c.json({ error: 'Erro ao gerar boleto no PagBank', details: result }, 400)
    }
    // 6. Sucesso: Extrai o link
    const charge = (result as any)?.charges ? (result as any).charges[0] : null
    const boletoLink = charge?.links?.find((l: any) => (l as any).rel === 'PAY')?.href
    const boletoId = (result as any)?.id
    // Salva no banco
    await supabase.from('company_invoices').insert({
      company_id,
      amount,
      status: 'pending',
      pagbank_id: boletoId,
      boleto_link: boletoLink,
      due_date,
      created_at: new Date().toISOString(),
    })
    return c.json({ success: true, boleto_link: boletoLink })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})
app.get('/admin/reports/purchases', async (c) => {
  try {
    const companyId = c.req.query('companyId')
    const range = c.req.query('range') || '7'
    const start = c.req.query('start')
    const end = c.req.query('end')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = (page - 1) * limit
    const dateISO = (d: Date) => d.toISOString().split('T')[0]
    const today = new Date()
    let fromDate: string | null = null
    let toDate: string | null = null
    if (range === 'today') { fromDate = dateISO(today); toDate = dateISO(today) }
    else if (range === 'yesterday') { const y = new Date(today); y.setDate(y.getDate() - 1); fromDate = dateISO(y); toDate = dateISO(y) }
    else if (range === '7' || range === '15' || range === '30') { const days = parseInt(range); const s = new Date(today); s.setDate(s.getDate() - days + 1); fromDate = dateISO(s); toDate = dateISO(today) }
    else if (range === 'custom' && start && end) { fromDate = start; toDate = end }
    const supabase = createSupabase()
    let query = supabase
      .from('company_purchases')
      .select('id, company_id, purchase_value, cashback_generated, purchase_date, customer_coupon, companies!inner(nome_fantasia)', { count: 'exact' })
      .order('purchase_date', { ascending: false })
    if (companyId) query = query.eq('company_id', Number(companyId))
    if (fromDate) query = query.gte('purchase_date', fromDate)
    if (toDate) query = query.lte('purchase_date', toDate)
    const { data: rows, count } = await query.range(offset, offset + limit - 1)
    let sumQuery = supabase.from('company_purchases').select('sum(purchase_value), sum(cashback_generated)').order('purchase_date', { ascending: false })
    if (companyId) sumQuery = sumQuery.eq('company_id', Number(companyId))
    if (fromDate) sumQuery = sumQuery.gte('purchase_date', fromDate)
    if (toDate) sumQuery = sumQuery.lte('purchase_date', toDate)
    const { data: sumRow } = await sumQuery.single()
    return c.json({ purchases: rows || [], totals: { total_purchase_value: (sumRow as any)?.sum?.purchase_value || 0, total_cashback_generated: (sumRow as any)?.sum?.cashback_generated || 0 }, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/admin/reports/purchases', async (c) => {
  try {
    const companyId = c.req.query('companyId')
    const range = c.req.query('range') || '7'
    const start = c.req.query('start')
    const end = c.req.query('end')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = (page - 1) * limit
    const dateISO = (d: Date) => d.toISOString().split('T')[0]
    const today = new Date()
    let fromDate: string | null = null
    let toDate: string | null = null
    if (range === 'today') { fromDate = dateISO(today); toDate = dateISO(today) }
    else if (range === 'yesterday') { const y = new Date(today); y.setDate(y.getDate() - 1); fromDate = dateISO(y); toDate = dateISO(y) }
    else if (range === '7' || range === '15' || range === '30') { const days = parseInt(range); const s = new Date(today); s.setDate(s.getDate() - days + 1); fromDate = dateISO(s); toDate = dateISO(today) }
    else if (range === 'custom' && start && end) { fromDate = start; toDate = end }
    const supabase = createSupabase()
    let query = supabase
      .from('company_purchases')
      .select('id, company_id, purchase_value, cashback_generated, purchase_date, customer_coupon, companies!inner(nome_fantasia)', { count: 'exact' })
      .order('purchase_date', { ascending: false })
    if (companyId) query = query.eq('company_id', Number(companyId))
    if (fromDate) query = query.gte('purchase_date', fromDate)
    if (toDate) query = query.lte('purchase_date', toDate)
    const { data: rows, count } = await query.range(offset, offset + limit - 1)
    let sumQuery = supabase.from('company_purchases').select('sum(purchase_value), sum(cashback_generated)').order('purchase_date', { ascending: false })
    if (companyId) sumQuery = sumQuery.eq('company_id', Number(companyId))
    if (fromDate) sumQuery = sumQuery.gte('purchase_date', fromDate)
    if (toDate) sumQuery = sumQuery.lte('purchase_date', toDate)
    const { data: sumRow } = await sumQuery.single()
    return c.json({ purchases: rows || [], totals: { total_purchase_value: (sumRow as any)?.sum?.purchase_value || 0, total_cashback_generated: (sumRow as any)?.sum?.cashback_generated || 0 }, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/admin/debug/cashier/diagnose', async (c) => {
  try {
    const token = getCookie(c, 'admin_session')
    if (!token) return c.json({ error: 'Não autorizado' }, 401)
    const supabase = createSupabase()
    const { data: adminSess } = await supabase
      .from('admin_sessions')
      .select('id')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!adminSess) return c.json({ error: 'Sessão inválida' }, 401)
    const cpfParam = String(c.req.query('cpf') || '').replace(/\D/g, '')
    if (!cpfParam) return c.json({ error: 'CPF inválido' }, 400)
    const { data: aff } = await supabase
      .from('affiliates')
      .select('id, full_name, cpf, is_active, created_at')
      .eq('cpf', cpfParam)
      .maybeSingle()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, cpf, mocha_user_id, is_active')
      .eq('cpf', cpfParam)
      .maybeSingle()
    const { data: coupon } = await supabase
      .from('customer_coupons')
      .select('id, coupon_code, user_id, affiliate_id, is_active, total_usage_count, last_used_at')
      .eq('coupon_code', cpfParam)
      .maybeSingle()
    const issues: string[] = []
    if (!aff && !profile) issues.push('NO_CUSTOMER_FOUND')
    if (aff && !(aff as any).is_active) issues.push('AFFILIATE_INACTIVE')
    if (!profile) issues.push('PROFILE_MISSING')
    if (!coupon) issues.push('COUPON_MISSING')
    if (coupon && !(coupon as any).is_active) issues.push('COUPON_INACTIVE')
    if (coupon && !(coupon as any).user_id) issues.push('COUPON_USER_ID_MISSING')
    return c.json({
      cpf: cpfParam,
      affiliate: aff || null,
      profile: profile || null,
      coupon: coupon || null,
      issues
    })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/admin/commission-settings', async (c) => {
  try {
    const supabase = createSupabase()
    const { data } = await supabase.from('global_commission_settings').select('level_settings').limit(1)
    let settings: Array<{ level: number; percentage: number }> = []
    if (data && data.length > 0) {
      const raw = (data[0] as any)?.level_settings
      if (Array.isArray(raw) && raw.length > 0) settings = raw
    }
    if (settings.length === 0) {
      settings = Array.from({ length: 10 }).map((_, i) => ({ level: i + 1, percentage: 10.0 }))
    }
    return c.json({ settings })
  } catch (e) {
    const settings = Array.from({ length: 10 }).map((_, i) => ({ level: i + 1, percentage: 10.0 }))
    return c.json({ settings })
  }
})

app.put('/api/admin/commission-settings', async (c) => {
  try {
    const body = await c.req.json()
    const settings = (body as any)?.settings as Array<{ level: number; percentage: number }>
    if (!Array.isArray(settings) || settings.length !== 10) return c.json({ error: 'Configurações inválidas' }, 400)
    const total = settings.reduce((s, it) => s + Number(it.percentage || 0), 0)
    if (Math.abs(total - 100.0) > 0.01) return c.json({ error: 'Total deve ser 100%' }, 400)
    const supabase = createSupabase()
    const { data: existing } = await supabase.from('global_commission_settings').select('id').limit(1)
    if (existing && existing.length > 0) {
      const id = (existing[0] as any).id
      const { error } = await supabase.from('global_commission_settings').update({ level_settings: settings, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) return c.json({ error: 'Erro interno do servidor' }, 500)
    } else {
      const { error } = await supabase.from('global_commission_settings').insert({ level_settings: settings, updated_at: new Date().toISOString() })
      if (error) return c.json({ error: 'Erro interno do servidor' }, 500)
    }
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/admin/affiliates/stats', async (c) => {
  try {
    const supabase = createSupabase()
    const { count: active } = await supabase.from('affiliates').select('*', { count: 'exact', head: true }).eq('is_active', true)
    const { count: inactive } = await supabase.from('affiliates').select('*', { count: 'exact', head: true }).eq('is_active', false)
    const { data: cbRows } = await supabase.from('company_purchases').select('cashback_generated')
    const totalCashbackGenerated = (cbRows || []).reduce((s: number, r: any) => s + Number(r.cashback_generated || 0), 0)
    const { data: pending } = await supabase.from('withdrawals').select('amount_requested').eq('status', 'pending')
    const totalCommissionsPending = (pending || []).reduce((s: number, r: any) => s + Number(r.amount_requested || 0), 0)
    const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    const { count: newAff } = await supabase.from('affiliates').select('*', { count: 'exact', head: true }).gte('created_at', start).lt('created_at', next)
    return c.json({ totalActive: active || 0, totalInactive: inactive || 0, totalCashbackGenerated, totalCommissionsPending, newAffiliatesThisMonth: newAff || 0 })
  } catch (e) {
    return c.json({ totalActive: 0, totalInactive: 0, totalCashbackGenerated: 0, totalCommissionsPending: 0, newAffiliatesThisMonth: 0 })
  }
})

app.get('/api/admin/affiliates', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const search = c.req.query('search') || ''
    const offset = (page - 1) * limit
    const supabase = createSupabase()
    let q = supabase
      .from('affiliates')
      .select('id, full_name, email, cpf, phone, is_active, is_verified, referral_code, sponsor_id, created_at, last_access_at', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,cpf.ilike.%${search}%`)
    const { data: rows, count } = await q.range(offset, offset + limit - 1)
    const items = [] as any[]
    for (const a of rows || []) {
      const { count: directs } = await supabase.from('affiliates').select('id', { count: 'exact', head: true }).eq('sponsor_id', (a as any).id)
      const { data: sumRow } = await supabase.from('company_purchases').select('sum(cashback_generated)').eq('customer_coupon', (a as any).cpf).single()
      let pending = 0
      const { data: profile } = await supabase.from('user_profiles').select('id').eq('mocha_user_id', `affiliate_${(a as any).id}`).single()
      if (profile) {
        const { data: pendRows } = await supabase.from('withdrawals').select('amount_requested').eq('user_id', (profile as any).id).eq('status', 'pending')
        pending = (pendRows || []).reduce((s: number, r: any) => s + Number(r.amount_requested || 0), 0)
      }
      items.push({
        id: (a as any).id,
        full_name: (a as any).full_name,
        email: (a as any).email,
        cpf: (a as any).cpf,
        whatsapp: (a as any).phone || null,
        is_active: Boolean((a as any).is_active),
        is_verified: Boolean((a as any).is_verified),
        referral_code: (a as any).referral_code || '',
        sponsor_id: (a as any).sponsor_id || null,
        direct_referrals: directs || 0,
        total_cashback: (sumRow as any)?.sum?.cashback_generated || 0,
        pending_commissions: pending,
        created_at: (a as any).created_at,
        last_access_at: (a as any).last_access_at || null,
      })
    }
    return c.json({ affiliates: items, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } })
  } catch (e) {
    return c.json({ affiliates: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })
  }
})

app.patch('/api/admin/affiliates/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const supabase = createSupabase()
    const update: any = {}
    if ((body as any).full_name) update.full_name = (body as any).full_name
    if ((body as any).email) update.email = (body as any).email
    if ((body as any).whatsapp) update.phone = String((body as any).whatsapp).replace(/\D/g, '')
    update.updated_at = new Date().toISOString()
    const { data: exists } = await supabase.from('affiliates').select('id').eq('id', id).single()
    if (!exists) return c.json({ error: 'Afiliado não encontrado' }, 404)
    const { error } = await supabase.from('affiliates').update(update).eq('id', id)
    if (error) return c.json({ error: 'Erro interno do servidor' }, 500)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.patch('/api/admin/affiliates/:id/toggle-status', async (c) => {
  try {
    const id = c.req.param('id')
    const supabase = createSupabase()
    const { data: a } = await supabase.from('affiliates').select('id,is_active').eq('id', id).single()
    if (!a) return c.json({ error: 'Afiliado não encontrado' }, 404)
    const newStatus = !(a as any).is_active
    const { error } = await supabase.from('affiliates').update({ is_active: newStatus, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return c.json({ error: 'Erro interno do servidor' }, 500)
    if (!newStatus) await supabase.from('affiliate_sessions').delete().eq('affiliate_id', id)
    return c.json({ success: true, newStatus })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.delete('/api/admin/affiliates/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const supabase = createSupabase()
    const { data: a } = await supabase.from('affiliates').select('id,cpf').eq('id', id).single()
    if (!a) return c.json({ error: 'Afiliado não encontrado' }, 404)
    const { count } = await supabase.from('company_purchases').select('*', { count: 'exact', head: true }).eq('customer_coupon', (a as any).cpf)
    if (count && count > 0) return c.json({ error: 'Não é possível excluir afiliado com compras registradas' }, 400)
    await supabase.from('affiliate_sessions').delete().eq('affiliate_id', id)
    const { error } = await supabase.from('affiliates').delete().eq('id', id)
    if (error) return c.json({ error: 'Erro interno do servidor' }, 500)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/admin/dashboard/charts', async (c) => {
  try {
    const supabase = createSupabase()
    const now = new Date()
    const monthlyStats: any[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split('T')[0]
      const { data: pRows } = await supabase.from('company_purchases').select('cashback_generated,purchase_value').gte('purchase_date', start).lt('purchase_date', end)
      const { count: companies } = await supabase.from('companies').select('*', { count: 'exact', head: true }).gte('created_at', start).lt('created_at', end)
      const { count: affiliates } = await supabase.from('affiliates').select('*', { count: 'exact', head: true }).gte('created_at', start).lt('created_at', end)
      const purchases = (pRows || []).length
      const cashback = (pRows || []).reduce((s: number, r: any) => s + Number(r.cashback_generated || 0), 0)
      monthlyStats.push({ month: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), purchases, cashback, companies: companies || 0, affiliates: affiliates || 0 })
    }
    const { count: affActive } = await supabase.from('affiliates').select('*', { count: 'exact', head: true }).eq('is_active', true)
    const { count: affInactive } = await supabase.from('affiliates').select('*', { count: 'exact', head: true }).eq('is_active', false)
    const { count: compActive } = await supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_active', true)
    const { count: compInactive } = await supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_active', false)
    const statusDistribution = [
      { name: 'Afiliados Ativos', value: affActive || 0, color: '#10b981' },
      { name: 'Afiliados Inativos', value: affInactive || 0, color: '#ef4444' },
      { name: 'Empresas Ativas', value: compActive || 0, color: '#3b82f6' },
      { name: 'Empresas Inativas', value: compInactive || 0, color: '#f59e0b' }
    ]
    const weeklyGrowth: any[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const start = d.toISOString().split('T')[0]
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString().split('T')[0]
      const { count: newAffiliates } = await supabase.from('affiliates').select('*', { count: 'exact', head: true }).gte('created_at', start).lt('created_at', end)
      const { count: newCompanies } = await supabase.from('companies').select('*', { count: 'exact', head: true }).gte('created_at', start).lt('created_at', end)
      const { data: pRows } = await supabase.from('company_purchases').select('id').gte('purchase_date', start).lt('purchase_date', end)
      weeklyGrowth.push({ day: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), newAffiliates: newAffiliates || 0, newCompanies: newCompanies || 0, totalPurchases: (pRows || []).length })
    }
    return c.json({ monthlyStats, statusDistribution, weeklyGrowth })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

// moved to end of file
const AffiliateLoginSchema = z.object({
  cpf: z.string().min(11),
  password: z.string().min(1)
})

function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11) return false
  if (/^(\d)\1{10}$/.test(clean)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i)) * (10 - i)
  let rem = (sum * 10) % 11
  if (rem === 10 || rem === 11) rem = 0
  if (rem !== parseInt(clean.charAt(9))) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i)) * (11 - i)
  rem = (sum * 10) % 11
  if (rem === 10 || rem === 11) rem = 0
  if (rem !== parseInt(clean.charAt(10))) return false
  return true
}

function getSessionExpiration(days = 30): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

const LEG_TO_SLOT: Record<'left' | 'center' | 'right', number> = { left: 0, center: 1, right: 2 }

function normalizeLegPreference(input: any): 'automatic' | 'left' | 'center' | 'right' {
  if (input === null || input === undefined) return 'automatic'
  const raw = String(input).toLowerCase().trim()
  if (raw === 'auto' || raw === 'automatic') return 'automatic'
  if (raw === 'left' || raw === 'esquerda' || raw === '0') return 'left'
  if (raw === 'center' || raw === 'centro' || raw === '1') return 'center'
  if (raw === 'right' || raw === 'direita' || raw === '2') return 'right'
  return 'automatic'
}

async function getSponsorPreference(supabase: any, sponsorId: number, debugLog?: string[]): Promise<'automatic' | 'left' | 'center' | 'right'> {
  const mochaUserId = `affiliate_${sponsorId}`
  console.log(`[PREF_DEBUG] Buscando preferência para Sponsor: ${sponsorId} (mocha_id: ${mochaUserId})`)

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, mocha_user_id')
    .eq('mocha_user_id', mochaUserId)
    .maybeSingle()

  if (profileError) {
    console.error(`[PREF_DEBUG] Erro ao buscar perfil:`, profileError)
    if (debugLog) debugLog.push(`PREF_ERR profile sponsor=${sponsorId}`)
    return 'automatic'
  }

  if (!profile) {
    console.error(`[PREF_DEBUG] PERFIL NÃO ENCONTRADO para ${mochaUserId}. O sistema usará AUTOMATIC. Verifique se o ID no banco user_profiles bate com 'affiliate_${sponsorId}'`)
    if (debugLog) debugLog.push(`PREF_NO_PROFILE sponsor=${sponsorId}`)
    return 'automatic'
  }

  console.log(`[PREF_DEBUG] Perfil encontrado: ID ${profile.id}. Buscando settings...`)

  const { data: settings, error: settingsError } = await supabase
    .from('user_settings')
    .select('leg_preference, user_id')
    .eq('user_id', (profile as any).id)
    .maybeSingle()

  if (settingsError) {
    console.error(`[PREF_DEBUG] Erro ao buscar settings:`, settingsError)
    if (debugLog) debugLog.push(`PREF_ERR settings sponsor=${sponsorId}`)
  }

  const rawPref = (settings as any)?.leg_preference
  console.log(`[PREF_DEBUG] Configuração crua no DB para Profile ${(profile as any).id}: "${rawPref}"`)

  const normalized = normalizeLegPreference(rawPref)
  console.log(`[PREF_DEBUG] Preferência final resolvida: "${normalized}"`)
  if (debugLog) debugLog.push(`PREF_OK sponsor=${sponsorId} profile=${(profile as any).id} raw=${rawPref} norm=${normalized}`)
  
  return normalized
}

async function getChildren(supabase: any, parentId: number): Promise<number[]> {
  const { data } = await supabase
    .from('affiliates')
    .select('id')
    .eq('sponsor_id', parentId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  return (data || []).map((r: any) => r.id as number)
}

async function getChildrenBySlot(supabase: any, parentId: number): Promise<(number | undefined)[]> {
  const { data } = await supabase
    .from('affiliates')
    .select('id, position_slot, created_at')
    .eq('sponsor_id', parentId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  const slots: (number | undefined)[] = [undefined, undefined, undefined]
  for (const row of data || []) {
    const ps = (row as any).position_slot
    if (ps === 0 || ps === 1 || ps === 2) {
      if (slots[ps] === undefined) {
        slots[ps] = (row as any).id as number
        continue
      }
    }
    for (let i = 0; i < 3; i++) {
      if (slots[i] === undefined) {
        slots[i] = (row as any).id as number
        break
      }
    }
  }
  return slots
}

async function getChildInSlot(supabase: any, parentId: number, slotIdx: number): Promise<number | null> {
  const { data } = await supabase
    .from('affiliates')
    .select('id')
    .eq('sponsor_id', parentId)
    .eq('is_active', true)
    .eq('position_slot', slotIdx)
    .order('created_at', { ascending: true })
    .maybeSingle()
  return (data as any)?.id ?? null
}

async function findPlacementTarget(supabase: any, rootSponsorId: number, preference: 'automatic' | 'left' | 'center' | 'right', maxDepth = 10, debugLog?: string[]): Promise<number> {
  if (preference === 'automatic') {
    const rootSlots = await getChildrenBySlot(supabase, rootSponsorId)
    if (rootSlots.some((s) => s === undefined)) return rootSponsorId
    const queue: number[] = [rootSponsorId]
    let depth = 0
    while (queue.length && depth <= maxDepth) {
      const current = queue.shift() as number
      const slots = await getChildrenBySlot(supabase, current)
      if (debugLog) debugLog.push(`AUTO depth=${depth} current=${current} free=${slots.some(s=>s===undefined)}`)
      if (slots.some((s) => s === undefined)) return current
      for (const c of slots) if (typeof c === 'number') queue.push(c)
      depth++
    }
    return rootSponsorId
  }
  const idx = LEG_TO_SLOT[preference as 'left' | 'center' | 'right']
  if (idx === undefined || idx === null) return rootSponsorId
  let currentId = rootSponsorId
  let level = 0
  while (level <= maxDepth) {
    const { data: child } = await supabase
      .from('affiliates')
      .select('id')
      .eq('sponsor_id', currentId)
      .eq('is_active', true)
      .eq('position_slot', idx)
      .maybeSingle()
    const childId = (child as any)?.id ?? null
    if (debugLog) debugLog.push(`STRICT level=${level} current=${currentId} idx=${idx} child=${childId ?? 'null'}`)
    if (!childId) return currentId
    currentId = childId
    level++
  }
  return rootSponsorId
}

app.post('/affiliate/login', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = AffiliateLoginSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Dados inválidos' }, 400)
    const cleanCpf = parsed.data.cpf.replace(/\D/g, '')
    if (!validateCPF(cleanCpf)) return c.json({ error: 'CPF inválido' }, 422)
    const supabase = createSupabase()
    const { data: authRow, error: rpcErr } = await supabase
      .rpc('login_affiliate', { p_cpf: cleanCpf, p_password: parsed.data.password })
      .single()
    if (rpcErr || !authRow) return c.json({ error: 'CPF ou senha inválidos' }, 401)
    const sessionToken = crypto.randomUUID() + '-' + Date.now()
    const expiresAt = getSessionExpiration()
    await supabase.from('affiliate_sessions').delete().eq('affiliate_id', (authRow as any).affiliate_id)
    const { error: insErr1 } = await supabase.from('affiliate_sessions').insert({ affiliate_id: (authRow as any).affiliate_id, session_token: sessionToken, expires_at: expiresAt.toISOString() })
    if (insErr1) return c.json({ error: 'Erro ao criar sessão do afiliado' }, 500)
    setCookie(c, 'affiliate_session', sessionToken, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 30 * 24 * 60 * 60 })
    return c.json({ success: true, token: sessionToken, affiliate: { id: (authRow as any).affiliate_id, full_name: (authRow as any).full_name, email: (authRow as any).email, referral_code: (authRow as any).referral_code, customer_coupon: (authRow as any).cpf } })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.post('/api/affiliate/login', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = AffiliateLoginSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Dados inválidos' }, 400)
    const cleanCpf = parsed.data.cpf.replace(/\D/g, '')
    if (!validateCPF(cleanCpf)) return c.json({ error: 'CPF inválido' }, 422)
    const supabase = createSupabase()
    const { data: authRow, error: rpcErr } = await supabase
      .rpc('login_affiliate', { p_cpf: cleanCpf, p_password: parsed.data.password })
      .single()
    if (rpcErr || !authRow) return c.json({ error: 'CPF ou senha inválidos' }, 401)
    const sessionToken = crypto.randomUUID() + '-' + Date.now()
    const expiresAt = getSessionExpiration()
    await supabase.from('affiliate_sessions').delete().eq('affiliate_id', (authRow as any).affiliate_id)
    const { error: insErr2 } = await supabase.from('affiliate_sessions').insert({ affiliate_id: (authRow as any).affiliate_id, session_token: sessionToken, expires_at: expiresAt.toISOString() })
    if (insErr2) return c.json({ error: 'Erro ao criar sessão do afiliado' }, 500)
    setCookie(c, 'affiliate_session', sessionToken, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 30 * 24 * 60 * 60 })
    return c.json({ success: true, token: sessionToken, affiliate: { id: (authRow as any).affiliate_id, full_name: (authRow as any).full_name, email: (authRow as any).email, referral_code: (authRow as any).referral_code, customer_coupon: (authRow as any).cpf } })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.post('/api/affiliate/register', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = z.object({
      full_name: z.string().min(1),
      cpf: z.string().min(11),
      email: z.string().email(),
      whatsapp: z.string().nullable().optional(),
      password: z.string().min(6),
      referral_code: z.string().nullable().optional(),
    }).safeParse(body)
    if (!parsed.success) return c.json({ error: 'Dados inválidos', field_errors: parsed.error.flatten().fieldErrors }, 400)
    const cleanCpf = parsed.data.cpf.replace(/\D/g, '')
    if (!validateCPF(cleanCpf)) return c.json({ error: 'CPF inválido', field: 'cpf' }, 400)
    const supabase = createSupabase()
    const { data: existingCpf } = await supabase.from('affiliates').select('id').eq('cpf', cleanCpf).single()
    if (existingCpf) return c.json({ error: 'CPF já está cadastrado', field: 'cpf' }, 409)
    const { data: existingEmail } = await supabase.from('affiliates').select('id').eq('email', parsed.data.email).single()
    if (existingEmail) return c.json({ error: 'E-mail já está cadastrado', field: 'email' }, 409)
    let sponsorId: number | null = null
    if (parsed.data.referral_code && parsed.data.referral_code.trim().length > 0) {
      const refCode = parsed.data.referral_code.trim().toUpperCase()
      const { data: sponsor } = await supabase
        .from('affiliates')
        .select('id')
        .eq('referral_code', refCode)
        .eq('is_active', true)
        .single()
      sponsorId = (sponsor as any)?.id ?? null
    }
    const debugLogs: string[] = []
    const passwordHash = await bcrypt.hash(parsed.data.password, 12)
    const nowIso = new Date().toISOString()
    // Generate unique referral_code before insert to satisfy NOT NULL/UNIQUE constraints
    let referralCode = ''
    for (let i = 0; i < 5; i++) {
      referralCode = ('CM' + crypto.randomUUID().replace(/-/g, '').slice(0, 8)).toUpperCase()
      const { data: exists } = await supabase.from('affiliates').select('id').eq('referral_code', referralCode).maybeSingle()
      if (!exists) break
    }
    let finalSponsorId: number | null = sponsorId
    let selectedPref: 'automatic' | 'left' | 'center' | 'right' = 'automatic'
    if (sponsorId) {
      selectedPref = await getSponsorPreference(supabase, sponsorId)
      debugLogs.push(`1. Preferência do Pai ${sponsorId}: ${selectedPref}`)
      finalSponsorId = await findPlacementTarget(supabase, sponsorId, selectedPref)
      debugLogs.push(`2. ID Final de Posicionamento: ${finalSponsorId}`)
      if (finalSponsorId !== sponsorId) {
        debugLogs.push(`3. O sistema desceu níveis (Drill-down)`)
      }
    }
    // --- CORREÇÃO DE SLOT: INÍCIO ---
    // 1. Definição Blindada do Slot (Padrão 0 para evitar NULL)
    let positionSlot: number = 0

    if (finalSponsorId) {
      const map: Record<string, number> = { 'center': 1, 'right': 2, 'centro': 1, 'direita': 2 }
      if (selectedPref && selectedPref !== 'automatic' && map[selectedPref] !== undefined) {
        positionSlot = map[selectedPref]
        console.log(`[DEBUG] Slot fixado pela preferência '${selectedPref}': ${positionSlot}`)
      } else {
        try {
          const slots = await getChildrenBySlot(supabase, finalSponsorId)
          for (let i = 0; i < 3; i++) {
            if (slots[i] === undefined) {
              positionSlot = i
              console.log(`[DEBUG] Slot automático encontrado: ${i}`)
              break
            }
          }
        } catch (err) {
          console.error('[DEBUG] Erro ao calcular slot automático, usando fallback 0:', err)
          positionSlot = 0
        }
      }
    }

    console.log(`>>> CHAMANDO RPC register_affiliate_v2 com SLOT: ${positionSlot}`)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('register_affiliate_v2', {
        p_full_name: parsed.data.full_name.trim(),
        p_cpf: cleanCpf,
        p_email: parsed.data.email.trim(),
        p_phone: parsed.data.whatsapp ? String(parsed.data.whatsapp).replace(/\D/g, '') : null,
        p_password_hash: passwordHash,
        p_sponsor_id: finalSponsorId,
        p_referral_code: referralCode,
        p_position_slot: positionSlot
      })
    if (rpcError) {
      console.error('>>> ERRO CRÍTICO NA RPC:', rpcError)
      return c.json({ error: 'Erro ao cadastrar via RPC', details: rpcError }, 500)
    }
    const newAffiliate: any = {
      id: (rpcData as any)?.id,
      full_name: parsed.data.full_name.trim(),
      email: parsed.data.email.trim(),
      cpf: cleanCpf,
      referral_code: referralCode,
      position_slot: positionSlot
    }
    const { data: verifyRow } = await supabase
      .from('affiliates')
      .select('id, position_slot, sponsor_id, created_at')
      .eq('id', (newAffiliate as any).id)
      .maybeSingle()
    const verifiedSlot = (verifyRow as any)?.position_slot ?? null
    debugLogs.push(`VERIFY_AFTER_RPC id=${(newAffiliate as any).id} slot=${verifiedSlot}`)
    if (verifiedSlot === null) {
      const { error: fixErr } = await supabase
        .from('affiliates')
        .update({ position_slot: positionSlot })
        .eq('id', (newAffiliate as any).id)
      debugLogs.push(`FIX_UPDATE slot=${positionSlot} err=${fixErr ? String(fixErr) : 'none'}`)
    }
    const profileId = await ensureProfileExists(supabase, cleanCpf, (newAffiliate as any).id as number)
    if (!profileId) return c.json({ error: 'Erro interno do servidor' }, 500)
    if (profileId) {
      const { data: existingCoupon } = await supabase
        .from('customer_coupons')
        .select('id')
        .eq('coupon_code', cleanCpf)
        .maybeSingle()
      const payload: any = { coupon_code: cleanCpf, user_id: profileId, cpf: cleanCpf, is_active: true, affiliate_id: (newAffiliate as any).id }
      const tryUpsert = async (useAffiliateId: boolean) => {
        const upPayload = { ...payload }
        if (!useAffiliateId) delete upPayload.affiliate_id
        const { error: upErr } = await supabase
          .from('customer_coupons')
          .upsert(upPayload, { onConflict: 'coupon_code' })
        return upErr
      }
      let upErr = await tryUpsert(true)
      if (upErr && String(upErr.message || upErr).toLowerCase().includes('affiliate_id')) {
        upErr = await tryUpsert(false)
      }
      if (upErr) return c.json({ error: 'Erro interno do servidor' }, 500)
      const { data: verifyCoupon } = await supabase
        .from('customer_coupons')
        .select('id')
        .eq('coupon_code', cleanCpf)
        .maybeSingle()
      if (!verifyCoupon) return c.json({ error: 'Erro interno do servidor' }, 500)
    }
    if (finalSponsorId) {
      await releaseBlockedIfQualified(supabase, finalSponsorId as number)
    }
    const sessionToken = crypto.randomUUID() + '-' + Date.now()
    const expiresAt = getSessionExpiration()
    await supabase
      .from('affiliate_sessions')
      .insert({ affiliate_id: (newAffiliate as any).id, session_token: sessionToken, expires_at: expiresAt.toISOString() })
    setCookie(c, 'affiliate_session', sessionToken, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 30 * 24 * 60 * 60 })
    debugLogs.push(`REGISTER_DONE affiliate=${(newAffiliate as any).id}`)
    return c.json({ success: true, affiliate: { id: (newAffiliate as any).id, full_name: (newAffiliate as any).full_name, email: (newAffiliate as any).email, referral_code: referralCode, customer_coupon: cleanCpf }, debug_info: debugLogs, versao_do_codigo: "VERSAO_CORRIGIDA_RPC_AGORA_VAI" })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/affiliate/me', async (c) => {
  const token = getCookie(c, 'affiliate_session')
  if (!token) return c.json({ error: 'Não autenticado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: sessionData } = await supabase
      .from('affiliate_sessions')
      .select('affiliate_id, affiliates!inner(id, full_name, cpf, email, phone, referral_code, sponsor_id, is_verified, created_at, last_access_at)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single()
    if (!sessionData) return c.json({ error: 'Sessão expirada' }, 401)
    const affiliate = (sessionData as any).affiliates
    await supabase.from('affiliates').update({ last_access_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', affiliate.id)
    return c.json({ id: affiliate.id, full_name: affiliate.full_name, cpf: affiliate.cpf, email: affiliate.email, whatsapp: (affiliate as any).phone, referral_code: affiliate.referral_code, customer_coupon: affiliate.cpf, sponsor_id: affiliate.sponsor_id, is_verified: Boolean(affiliate.is_verified), created_at: affiliate.created_at, last_access_at: affiliate.last_access_at })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/affiliate/me', async (c) => {
  const cookieToken = getCookie(c, 'affiliate_session')
  const authHeader = c.req.header('authorization') || ''
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''
  const token = cookieToken || bearerToken
  console.log('[AFFILIATE_ME] token source:', cookieToken ? 'cookie' : (bearerToken ? 'header' : 'none'), 'token=', token)
  if (!token) return c.json({ error: 'Token não enviado pelo navegador' }, 401)
  try {
    const supabase = createSupabase()
    console.log('[AFFILIATE_ME] Query params:', { table: 'affiliate_sessions', where: { session_token: token, expires_at_gt: new Date().toISOString() } })
    const { data: sessionRow } = await supabase
      .from('affiliate_sessions')
      .select('affiliate_id, expires_at')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    console.log('[AFFILIATE_ME] Raw sessionRow:', sessionRow)
    if (!sessionRow) return c.json({ error: 'Sessão não encontrada no banco', token_recebido: (token || '').slice(0, 10) + '...' }, 401)
    const affId = String((sessionRow as any).affiliate_id || '')
    if (!affId) return c.json({ error: 'Sessão órfã: ID do afiliado vazio', id_na_sessao: affId }, 401)
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, full_name, cpf, email, phone, referral_code, sponsor_id, is_verified, created_at, last_access_at, is_active')
      .eq('id', affId)
      .single()
    console.log('[AFFILIATE_ME] Raw affiliate:', affiliate)
    if (!affiliate) return c.json({ error: 'Sessão órfã: ID do afiliado não existe', id_na_sessao: affId }, 401)
    if (!(affiliate as any).is_active) return c.json({ error: 'Afiliado inativo', id_na_sessao: affId }, 401)
    await supabase.from('affiliates').update({ last_access_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', (affiliate as any).id)
    return c.json({ id: (affiliate as any).id, full_name: (affiliate as any).full_name, cpf: (affiliate as any).cpf, email: (affiliate as any).email, whatsapp: (affiliate as any).phone, referral_code: (affiliate as any).referral_code, customer_coupon: (affiliate as any).cpf, sponsor_id: (affiliate as any).sponsor_id, is_verified: Boolean((affiliate as any).is_verified), created_at: (affiliate as any).created_at, last_access_at: (affiliate as any).last_access_at })
  } catch (e) {
    console.log('[AFFILIATE_ME] Exception:', e)
    return c.json({ error: 'Erro interno do servidor', debug: String(e) }, 500)
  }
})

app.post('/affiliate/logout', async (c) => {
  const token = getCookie(c, 'affiliate_session')
  try {
    if (token) {
      const supabase = createSupabase()
      await supabase.from('affiliate_sessions').delete().eq('session_token', token)
    }
  } catch {}
  setCookie(c, 'affiliate_session', '', { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 0 })
  return c.json({ success: true })
})

app.post('/api/affiliate/logout', async (c) => {
  const token = getCookie(c, 'affiliate_session')
  try {
    if (token) {
      const supabase = createSupabase()
      await supabase.from('affiliate_sessions').delete().eq('session_token', token)
    }
  } catch {}
  setCookie(c, 'affiliate_session', '', { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 0 })
  return c.json({ success: true })
})

app.get('/api/users/balance', async (c) => {
  const token = getCookie(c, 'affiliate_session')
  if (!token) return c.json({ error: 'Não autenticado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: sessionData } = await supabase
      .from('affiliate_sessions')
      .select('affiliate_id, affiliates!inner(id, cpf)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single()
    if (!sessionData) return c.json({ error: 'Sessão expirada' }, 401)
    const affiliate = (sessionData as any).affiliates
    let baseAvailable = 0
    let baseFrozen = 0
    let usedCommissionTable = false
    let directCount = 0
    try {
      const { count } = await supabase
        .from('affiliates')
        .select('*', { count: 'exact', head: true })
        .eq('sponsor_id', affiliate.id)
        .eq('is_active', true)
      directCount = Number(count || 0)
    } catch {}
    try {
      const { data: dist } = await supabase
        .from('commission_distributions')
        .select('commission_amount, is_blocked, level')
        .eq('affiliate_id', affiliate.id)
      if (Array.isArray(dist)) {
        const qualifies = directCount >= 3
        if (qualifies) {
          try { await releaseBlockedIfQualified(supabase, affiliate.id) } catch {}
        }
        for (const r of dist) {
          const amt = Number((r as any).commission_amount || 0)
          const lvl = Number((r as any).level || 0)
          if (lvl === 0) {
            baseAvailable += amt
          } else {
            if (qualifies) baseAvailable += amt
            else baseFrozen += amt
          }
        }
        usedCommissionTable = true
      }
    } catch {}
    if (!usedCommissionTable) {
      const { data: purchaseTransactions } = await supabase
        .from('company_purchases')
        .select('cashback_generated')
        .eq('customer_coupon', affiliate.cpf)
      const purchaseCashback = (purchaseTransactions || []).reduce((s: number, tx: any) => s + (Number((tx as any).cashback_generated || 0) * 0.07), 0)
      baseAvailable = Math.round(purchaseCashback * 100) / 100
      baseFrozen = 0
    }
    const profileId = await ensureProfileExists(supabase, affiliate.cpf as string, affiliate.id as number)
    const profile = { id: profileId }
    const { data: withdrawalData } = await supabase
      .from('withdrawals')
      .select('amount_requested')
      .eq('user_id', (profile as any).id)
      .eq('status', 'approved')
    const totalWithdrawn = (withdrawalData || []).reduce((s: number, w: any) => s + Number((w as any).amount_requested || 0), 0)
    const { data: frozenData } = await supabase
      .from('withdrawals')
      .select('amount_requested')
      .eq('user_id', (profile as any).id)
      .eq('status', 'pending')
    const pendingWithdrawals = (frozenData || []).reduce((s: number, w: any) => s + Number((w as any).amount_requested || 0), 0)
    const availableBalance = Math.max(0, baseAvailable - totalWithdrawn - pendingWithdrawals)
    const frozenBalance = Math.max(0, baseFrozen + pendingWithdrawals)
    const totalCommissions = Math.round((baseAvailable + baseFrozen) * 100) / 100
    const isActiveThisMonth = totalCommissions > 0
    let { data: settingsData } = await supabase
      .from('user_settings')
      .select('pix_key')
      .eq('user_id', (profile as any).id)
      .single()
    let pixKey = (settingsData as any)?.pix_key || null
    if (!settingsData) {
      await supabase
        .from('user_settings')
        .insert({ user_id: (profile as any).id, is_active_this_month: isActiveThisMonth, available_balance: availableBalance, frozen_balance: frozenBalance, total_earnings: totalCommissions })
    } else {
      await supabase
        .from('user_settings')
        .update({ is_active_this_month: isActiveThisMonth, available_balance: availableBalance, frozen_balance: frozenBalance, total_earnings: totalCommissions, updated_at: new Date().toISOString() })
        .eq('user_id', (profile as any).id)
    }
    return c.json({ available_balance: availableBalance, frozen_balance: frozenBalance, total_earnings: totalCommissions, company_earnings: 0, net_earnings: totalCommissions, is_active_this_month: isActiveThisMonth, pix_key: pixKey })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/withdrawals', async (c) => {
  const token = getCookie(c, 'affiliate_session')
  if (!token) return c.json({ error: 'Não autenticado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: sessionData } = await supabase
      .from('affiliate_sessions')
      .select('affiliate_id, affiliates!inner(id)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single()
    if (!sessionData) return c.json({ error: 'Sessão expirada' }, 401)
    const affiliateId = (sessionData as any).affiliates.id
    let { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('mocha_user_id', `affiliate_${affiliateId}`)
      .single()
    if (!profile) {
      const { data: newProfile } = await supabase
        .from('user_profiles')
        .insert({ mocha_user_id: `affiliate_${affiliateId}`, role: 'affiliate', is_active: true })
        .select()
        .single()
      profile = newProfile
    }
    const { data: rows } = await supabase
      .from('withdrawals')
      .select('id, amount_requested, fee_amount, net_amount, status, pix_key, created_at')
      .eq('user_id', (profile as any).id)
      .order('created_at', { ascending: false })
      .limit(50)
    return c.json(rows || [])
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.post('/api/withdrawals/request', async (c) => {
  const token = getCookie(c, 'affiliate_session')
  if (!token) return c.json({ error: 'Não autenticado' }, 401)
  try {
    const body = await c.req.json()
    const amount = Number((body as any)?.amount)
    if (!amount || amount < 50) return c.json({ error: 'Valor mínimo para saque é R$ 50,00' }, 400)
    const supabase = createSupabase()
    const { data: sessionData } = await supabase
      .from('affiliate_sessions')
      .select('affiliate_id, affiliates!inner(id, cpf)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!sessionData) return c.json({ error: 'Sessão expirada' }, 401)
    const affiliateId = (sessionData as any).affiliates.id as number
    const { data: profileWithSettings } = await supabase
      .from('user_profiles')
      .select('id, user_settings: user_settings!inner(available_balance, pix_key)')
      .eq('mocha_user_id', `affiliate_${affiliateId}`)
      .single()
    if (!profileWithSettings) return c.json({ error: 'Perfil não encontrado' }, 404)
    const profileId = (profileWithSettings as any).id as number
    const settings = (profileWithSettings as any).user_settings
    const currentBalance = Number(settings?.available_balance || 0)
    const pixKey = settings?.pix_key || null
    if (!pixKey) return c.json({ error: 'Cadastre sua chave PIX nas configurações antes de sacar' }, 400)
    if (currentBalance < amount) return c.json({ error: 'Saldo insuficiente' }, 400)
    const newBalance = currentBalance - amount
    const { error: updateErr } = await supabase
      .from('user_settings')
      .update({ available_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', profileId)
      .eq('available_balance', currentBalance)
    if (updateErr) return c.json({ error: 'Erro ao processar saldo. Tente novamente.' }, 500)
    const { error: insertErr } = await supabase
      .from('withdrawals')
      .insert({ user_id: profileId, affiliate_id: affiliateId, amount_requested: amount, status: 'pending', pix_key: pixKey, created_at: new Date().toISOString() })
    if (insertErr) {
      await supabase.from('user_settings').update({ available_balance: currentBalance, updated_at: new Date().toISOString() }).eq('user_id', profileId)
      return c.json({ error: 'Erro ao registrar saque' }, 500)
    }
    return c.json({ success: true, new_balance: newBalance })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})
app.post('/api/withdrawals', async (c) => {
  const token = getCookie(c, 'affiliate_session')
  if (!token) return c.json({ error: 'Não autenticado' }, 401)
  try {
    const body = await c.req.json()
    const amount = Number(body?.amount || 0)
    if (!amount || amount <= 0) return c.json({ error: 'Valor inválido' }, 400)
    const supabase = createSupabase()
    const { data: sessionData } = await supabase
      .from('affiliate_sessions')
      .select('affiliate_id, affiliates!inner(id)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single()
    if (!sessionData) return c.json({ error: 'Sessão expirada' }, 401)
    const affiliateId = (sessionData as any).affiliates.id as number
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('mocha_user_id', `affiliate_${affiliateId}`)
      .single()
    if (!profile) return c.json({ error: 'Configure suas informações primeiro' }, 400)
    const profileId = (profile as any).id as number
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    const { data: existingWithdrawal } = await supabase
      .from('withdrawals')
      .select('id')
      .eq('user_id', profileId)
      .gte('created_at', monthStart)
      .lt('created_at', nextMonthStart)
      .maybeSingle()
    if (existingWithdrawal) return c.json({ error: 'Você já solicitou um saque este mês. Saques são limitados a 1 por mês.' }, 400)
    const { data: settings } = await supabase
      .from('user_settings')
      .select('available_balance, frozen_balance, total_earnings, is_active_this_month, pix_key')
      .eq('user_id', profileId)
      .single()
    if (!settings) return c.json({ error: 'Configure suas informações primeiro' }, 400)
    if (!(settings as any).pix_key) return c.json({ error: 'Configure sua chave PIX primeiro' }, 400)
    if (!(settings as any).is_active_this_month) return c.json({ error: 'Você precisa ter feito pelo menos uma compra no mês anterior' }, 400)
    const available = Number((settings as any).available_balance || 0)
    if (amount > available) return c.json({ error: 'Saldo insuficiente' }, 400)
    const { data: withdrawal, error: wErr } = await supabase
      .from('withdrawals')
      .insert({
        user_id: profileId,
        affiliate_id: affiliateId,
        amount_requested: amount,
        fee_amount: 0,
        net_amount: amount,
        status: 'pending',
        pix_key: (settings as any).pix_key,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (wErr || !withdrawal) return c.json({ error: 'Erro ao criar solicitação de saque' }, 500)
    const { error: upErr } = await supabase
      .from('user_settings')
      .update({
        available_balance: available - amount,
        frozen_balance: Number((settings as any).frozen_balance || 0) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', profileId)
    if (upErr) return c.json({ error: 'Erro ao atualizar saldo' }, 500)
    return c.json({ success: true, withdrawal: { id: (withdrawal as any).id, amount_requested: amount, fee_amount: 0, net_amount: amount, status: 'pending' } })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})
app.get('/api/affiliate/settings', async (c) => {
  const token = getCookie(c, 'affiliate_session')
  if (!token) return c.json({ error: 'Não autenticado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: sessionData } = await supabase
      .from('affiliate_sessions')
      .select('affiliate_id, affiliates!inner(id, cpf, full_name, phone)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single()
    if (!sessionData) return c.json({ error: 'Sessão expirada' }, 401)
    const affiliate = (sessionData as any).affiliates
    let { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('mocha_user_id', `affiliate_${affiliate.id}`)
      .single()
    if (!profile) {
      const { data: upsertedProfile } = await supabase
        .from('user_profiles')
        .upsert({ mocha_user_id: `affiliate_${affiliate.id}`, cpf: affiliate.cpf || '', role: 'affiliate', is_active: true }, { onConflict: 'mocha_user_id' })
        .select()
        .single()
      profile = upsertedProfile
    }
    let { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', (profile as any).id)
      .single()
    if (!settings) {
      const { data: newSettings } = await supabase
        .from('user_settings')
        .insert({ user_id: (profile as any).id, leg_preference: 'automatic' })
        .select()
        .single()
      settings = newSettings
    }
    return c.json({ pix_key: (settings as any)?.pix_key, leg_preference: (settings as any)?.leg_preference || 'automatic', full_name: affiliate.full_name, phone: affiliate.phone })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.post('/api/affiliate/settings', async (c) => {
  const token = getCookie(c, 'affiliate_session')
  if (!token) return c.json({ error: 'Não autenticado' }, 401)
  try {
    const body = await c.req.json()
    const supabase = createSupabase()
    const { data: sessionData } = await supabase
      .from('affiliate_sessions')
      .select('affiliate_id, affiliates!inner(id, cpf)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single()
    if (!sessionData) return c.json({ error: 'Sessão expirada' }, 401)
    const affiliate = (sessionData as any).affiliates
    await supabase
      .from('affiliates')
      .update({ full_name: body.full_name, phone: body.phone, updated_at: new Date().toISOString() })
      .eq('id', affiliate.id)
    let { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('mocha_user_id', `affiliate_${affiliate.id}`)
      .single()
    if (!profile) {
      const { data: upsertedProfile } = await supabase
        .from('user_profiles')
        .upsert({ mocha_user_id: `affiliate_${affiliate.id}`, cpf: affiliate.cpf || '', role: 'affiliate', is_active: true }, { onConflict: 'mocha_user_id' })
        .select()
        .single()
      profile = upsertedProfile
    }
    const normalizedPref = normalizeLegPreference(body.leg_preference)
    const { error: upErr } = await supabase
      .from('user_settings')
      .upsert({ user_id: (profile as any).id, pix_key: body.pix_key, leg_preference: normalizedPref, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (upErr) return c.json({ error: 'Erro interno do servidor' }, 500)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/transactions', async (c) => {
  const token = getCookie(c, 'affiliate_session')
  if (!token) return c.json({ error: 'Não autenticado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: sessionData } = await supabase
      .from('affiliate_sessions')
      .select('affiliate_id, affiliates!inner(id, cpf)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single()
    if (!sessionData) return c.json({ error: 'Sessão expirada' }, 401)
    const affiliate = (sessionData as any).affiliates
    let formatted: any[] = []
    let usedCommissionTable = false
    try {
      const { data: dist } = await supabase
        .from('commission_distributions')
        .select('purchase_id, level, commission_amount, created_at')
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (Array.isArray(dist) && dist.length) {
        const pids = Array.from(new Set(dist.map((d: any) => (d as any).purchase_id).filter(Boolean)))
        let purchasesMap = new Map<number, any>()
        let companiesMap = new Map<number, any>()
        if (pids.length) {
          const { data: purchases } = await supabase
            .from('company_purchases')
            .select('id, company_id, purchase_value, cashback_generated, created_at')
            .in('id', pids)
          for (const p of purchases || []) purchasesMap.set(Number((p as any).id), p)
          const cids = Array.from(new Set((purchases || []).map((p: any) => Number((p as any).company_id)).filter(Boolean)))
          if (cids.length) {
            const { data: companies } = await supabase
              .from('companies')
              .select('id, nome_fantasia')
              .in('id', cids)
            for (const c of companies || []) companiesMap.set(Number((c as any).id), c)
          }
        }
        formatted = dist.map((d: any) => {
          const pid = Number((d as any).purchase_id)
          const p = purchasesMap.get(pid)
          const comp = p ? companiesMap.get(Number((p as any).company_id)) : null
          return {
            id: pid,
            company_name: comp?.nome_fantasia || '',
            purchase_value: Number(p?.purchase_value || 0),
            cashback_value: Math.round(Number((d as any).commission_amount || 0) * 100) / 100,
            level_earned: Number((d as any).level || 0),
            transaction_date: (p?.created_at || (d as any).created_at),
          }
        })
        usedCommissionTable = true
      }
    } catch {}
    if (!usedCommissionTable) {
      const { data: transactions } = await supabase
        .from('company_purchases')
        .select('id, companies!inner(nome_fantasia), purchase_value, cashback_generated, created_at')
        .eq('customer_coupon', affiliate.cpf)
        .order('created_at', { ascending: false })
        .limit(50)
      formatted = (transactions || []).map((tx: any) => ({
        id: tx.id,
        company_name: tx.companies?.nome_fantasia || '',
        purchase_value: Number(tx.purchase_value || 0),
        cashback_value: Math.round(Number(tx.cashback_generated || 0) * 0.07 * 100) / 100,
        level_earned: 1,
        transaction_date: tx.created_at,
      }))
    }
    return c.json(formatted)
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.post('/api/empresa/login', async (c) => {
  try {
    const body = await c.req.json()
    const supabase = createSupabase()
    let email = ''
    let senha = ''
    if ((body as any).email) { email = (body as any).email; senha = (body as any).senha }
    else if ((body as any).cnpj) {
      const cleanCnpj = String((body as any).cnpj).replace(/\D/g, '')
      let { data: companyByCnpj } = await supabase.from('companies').select('email').eq('cnpj', cleanCnpj).eq('is_active', true).single()
      if (!companyByCnpj) {
        const fallback = await supabase.from('companies').select('email').eq('cnpj', (body as any).cnpj).eq('is_active', true).single()
        companyByCnpj = fallback.data as any
      }
      if (!companyByCnpj) return c.json({ error: 'CNPJ ou senha inválidos' }, 401)
      email = (companyByCnpj as any).email; senha = (body as any).senha
    } else { return c.json({ error: 'Email ou CNPJ é obrigatório' }, 400) }
    const { data: company } = await supabase.from('companies').select('*').eq('email', email).eq('is_active', true).single()
    if (!company) return c.json({ error: 'Email ou senha inválidos' }, 401)
    const ok = await bcrypt.compare(senha, (company as any).senha_hash as string)
    if (!ok) return c.json({ error: 'Email ou senha inválidos' }, 401)
    const sessionToken = crypto.randomUUID().replace(/-/g, '')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await supabase.from('company_sessions').insert({ company_id: (company as any).id, session_token: sessionToken, expires_at: expiresAt.toISOString() })
    setCookie(c, 'company_session', sessionToken, { httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 24 * 60 * 60, path: '/' })
    return c.json({ success: true, company: { id: (company as any).id, razao_social: (company as any).razao_social, nome_fantasia: (company as any).nome_fantasia, email: (company as any).email, role: 'company' } })
  } catch (e) { return c.json({ error: 'Erro interno do servidor' }, 500) }
})

app.get('/api/empresa/me', async (c) => {
  const token = getCookie(c, 'company_session')
  if (!token) return c.json({ error: 'Não autorizado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: session } = await supabase
      .from('company_sessions')
      .select('*, companies!inner(id, razao_social, nome_fantasia, email)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!session) return c.json({ error: 'Não autorizado' }, 401)
    const comp = (session as any).companies
    return c.json({ id: comp.id, razao_social: comp.razao_social, nome_fantasia: comp.nome_fantasia, email: comp.email, role: 'company' })
  } catch (e) { return c.json({ error: 'Erro interno do servidor' }, 500) }
})

app.post('/api/empresa/logout', async (c) => {
  const token = getCookie(c, 'company_session')
  try { if (token) { const supabase = createSupabase(); await supabase.from('company_sessions').delete().eq('session_token', token) } } catch {}
  setCookie(c, 'company_session', '', { httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 0, path: '/' })
  return c.json({ success: true })
})

app.post('/api/caixa/login', async (c) => {
  try {
    const body = await c.req.json()
    const supabase = createSupabase()
    const cleanCpf = String((body as any).cpf || '').replace(/\D/g, '')
    let { data: cashier } = await supabase
      .from('company_cashiers')
      .select('*, companies!inner(nome_fantasia)')
      .eq('cpf', cleanCpf)
      .eq('is_active', true)
      .eq('companies.is_active', true)
      .single()
    if (!cashier && (body as any).cpf !== cleanCpf) {
      const fallback = await supabase
        .from('company_cashiers')
        .select('*, companies!inner(nome_fantasia)')
        .eq('cpf', (body as any).cpf)
        .eq('is_active', true)
        .eq('companies.is_active', true)
        .single()
      cashier = fallback.data as any
    }
    if (!cashier) return c.json({ error: 'CPF ou senha inválidos' }, 401)
    let storedHash = (cashier as any).password_hash as string | null
    if (!storedHash) {
      const newHash = await bcrypt.hash(String((body as any).password), 12)
      await supabase
        .from('company_cashiers')
        .update({ password_hash: newHash, updated_at: new Date().toISOString() })
        .eq('id', (cashier as any).id)
      storedHash = newHash
    }
    const ok = await bcrypt.compare(String((body as any).password), storedHash as string)
    if (!ok) return c.json({ error: 'CPF ou senha inválidos' }, 401)
    await supabase.from('company_cashiers').update({ last_access_at: new Date().toISOString() }).eq('id', (cashier as any).id)
    const sessionToken = crypto.randomUUID().replace(/-/g, '')
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000)
    await supabase.from('cashier_sessions').insert({ cashier_id: (cashier as any).id, session_token: sessionToken, expires_at: expiresAt.toISOString() })
    setCookie(c, 'cashier_session', sessionToken, { httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 8 * 60 * 60, path: '/' })
    return c.json({ success: true, cashier: { id: (cashier as any).id, name: (cashier as any).name, cpf: (cashier as any).cpf, company_name: (cashier as any).companies.nome_fantasia, role: 'cashier' } })
  } catch (e) { return c.json({ error: 'Erro interno do servidor' }, 500) }
})

app.get('/api/caixa/me', async (c) => {
  const token = getCookie(c, 'cashier_session')
  if (!token) return c.json({ error: 'Não autorizado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: session } = await supabase
      .from('cashier_sessions')
      .select('*, company_cashiers!inner(id, name, cpf, companies!inner(nome_fantasia, id))')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!session) return c.json({ error: 'Não autorizado' }, 401)
    const cx = (session as any).company_cashiers
    return c.json({ cashier: { id: cx.id, name: cx.name, cpf: cx.cpf, company_name: (cx as any).companies.nome_fantasia, role: 'cashier' } })
  } catch (e) { return c.json({ error: 'Erro interno do servidor' }, 500) }
})

app.post('/api/caixa/compra', async (c) => {
  const token = getCookie(c, 'cashier_session')
  if (!token) return c.json({ error: 'Não autorizado', error_code: 'NO_SESSION' }, 401)
  try {
    const body = await c.req.json()
    const rawCoupon = String((body as any)?.customer_coupon || '').trim()
    let rawValue = (body as any)?.purchase_value
    const parseMoney = (v: any): number => {
      if (typeof v === 'number') return v
      const s = String(v || '').trim()
      if (!s) return NaN
      const br = s.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(/,/g, '.')
      const n = parseFloat(br)
      return isNaN(n) ? NaN : n
    }
    const purchaseValue = parseMoney(rawValue)
    if (!rawCoupon || isNaN(purchaseValue) || purchaseValue <= 0) {
      return c.json({ error: 'Dados da compra inválidos', error_code: 'INVALID_INPUT', details: { customer_coupon: rawCoupon, purchase_value: rawValue } }, 400)
    }
    const supabase = createSupabase()
    const { data: session } = await supabase
      .from('cashier_sessions')
      .select('*, company_cashiers!inner(id, cpf, companies!inner(id))')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!session) return c.json({ error: 'Não autorizado', error_code: 'SESSION_EXPIRED' }, 401)
    const cleanCpf = rawCoupon.replace(/\D/g, '')
    const cleanCashierCpf = String((session as any).company_cashiers.cpf).replace(/[.-]/g, '')
    if (cleanCpf === cleanCashierCpf) return c.json({ error: 'Você não pode usar seu próprio CPF', error_code: 'OWN_CPF_BLOCKED' }, 400)
    let { data: customer } = await supabase
      .from('affiliates')
      .select('id, cpf, full_name, is_active')
      .eq('cpf', cleanCpf)
      .eq('is_active', true)
      .single()
    let customerType = 'affiliate'
    let customerData: any = customer
    if (!customer) {
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('id, cpf, mocha_user_id, is_active')
        .eq('cpf', cleanCpf)
        .eq('is_active', true)
        .single()
      if (userData) {
        customerType = 'user'
        customerData = { id: userData.id, cpf: userData.cpf, full_name: userData.mocha_user_id, is_active: userData.is_active }
      }
    }
    if (!customerData) return c.json({ error: 'CPF não encontrado ou cliente inativo', error_code: 'CUSTOMER_NOT_FOUND', details: { cpf: cleanCpf } }, 404)
    let { data: config } = await supabase
      .from('company_cashback_config')
      .select('cashback_percentage')
      .eq('company_id', (session as any).company_cashiers.companies.id)
      .single()
    if (!config) {
      await supabase
        .from('company_cashback_config')
        .upsert({ company_id: (session as any).company_cashiers.companies.id, cashback_percentage: 5.0 }, { onConflict: 'company_id' })
      const cfgRes = await supabase
        .from('company_cashback_config')
        .select('cashback_percentage')
        .eq('company_id', (session as any).company_cashiers.companies.id)
        .single()
      config = cfgRes.data as any
    }
    const cashbackPercentage = (config as any)?.cashback_percentage ?? 5.0
    const cashbackGenerated = (purchaseValue * cashbackPercentage) / 100
    let { data: customerCouponData } = await supabase
      .from('customer_coupons')
      .select('id, user_id, is_active, total_usage_count')
      .eq('coupon_code', cleanCpf)
      .maybeSingle()
    // Resolve user_id for coupon (create profile for affiliate if missing)
    let userIdForCoupon: number | null = customerType === 'user' ? (customerData as any).id : null
    if (customerType === 'affiliate') {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('mocha_user_id', `affiliate_${customerData.id}`)
        .single()
      if (userProfile) userIdForCoupon = (userProfile as any).id
      else {
        const { data: newProfile } = await supabase
          .from('user_profiles')
          .upsert({ mocha_user_id: `affiliate_${customerData.id}`, cpf: customerData.cpf, role: 'affiliate', is_active: true }, { onConflict: 'mocha_user_id' })
          .select()
          .single()
        userIdForCoupon = (newProfile as any)?.id || null
      }
    }
    if (!customerCouponData) {
      const { data: inserted } = await supabase
        .from('customer_coupons')
        .insert({ coupon_code: cleanCpf, user_id: userIdForCoupon, is_active: true })
        .select()
        .single()
      customerCouponData = inserted
      if (customerCouponData) {
        await supabase
          .from('customer_coupons')
          .update({ cpf: cleanCpf, affiliate_id: customerType === 'affiliate' ? customerData.id : null })
          .eq('id', (customerCouponData as any).id)
      }
    } else if (!(customerCouponData as any).is_active) {
      const { data: activated } = await supabase
        .from('customer_coupons')
        .update({ is_active: true })
        .eq('id', (customerCouponData as any).id)
        .select()
        .single()
      customerCouponData = activated || customerCouponData
    }
    // Ensure coupon has user_id set
    if (customerCouponData && !(customerCouponData as any).user_id && userIdForCoupon) {
      const { data: fixedCoupon } = await supabase
        .from('customer_coupons')
        .update({ user_id: userIdForCoupon })
        .eq('id', (customerCouponData as any).id)
        .select()
        .single()
      customerCouponData = fixedCoupon || customerCouponData
    }
    const { data: purchase, error: purchaseError } = await supabase
      .from('company_purchases')
      .insert({
        company_id: (session as any).company_cashiers.companies.id,
        cashier_id: (session as any).company_cashiers.id,
        customer_coupon_id: (customerCouponData as any).id,
        customer_coupon: cleanCpf,
        cashier_cpf: cleanCashierCpf,
        purchase_value: purchaseValue,
        cashback_percentage: cashbackPercentage,
        cashback_generated: cashbackGenerated,
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_time: new Date().toTimeString().split(' ')[0]
      })
      .select()
      .single()
    if (purchaseError) return c.json({ error: 'Erro ao registrar compra', error_code: 'PURCHASE_INSERT_FAILED' }, 500)
    const { error: couponError } = await supabase
      .from('customer_coupons')
      .update({ last_used_at: new Date().toISOString(), total_usage_count: ((customerCouponData as any).total_usage_count || 0) + 1 })
      .eq('id', (customerCouponData as any).id)
    if (couponError) {}
    let customerCommissionMessage = ''
    if (customerType === 'affiliate') {
      const customerCommission = cashbackGenerated * 0.70 * 0.10
      customerCommissionMessage = `Comissão de R$ ${customerCommission.toFixed(2)} será creditada para ${customerData.full_name} (cashback de R$ ${cashbackGenerated.toFixed(2)} gerado)`
    } else {
      customerCommissionMessage = `Cashback de R$ ${cashbackGenerated.toFixed(2)} creditado para ${customerData.full_name}`
    }
    try {
      await distributeNetworkCommissionsSupabase(supabase, (purchase as any).id, customerType, customerData.id, cashbackGenerated)
    } catch {}
    return c.json({ success: true, message: `Compra registrada! ${customerCommissionMessage}`, cashback_generated: cashbackGenerated, customer_name: customerData.full_name })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor', error_code: 'UNEXPECTED_SERVER_ERROR' }, 500)
  }
})

app.post('/api/caixa/logout', async (c) => {
  const token = getCookie(c, 'cashier_session')
  try { if (token) { const supabase = createSupabase(); await supabase.from('cashier_sessions').delete().eq('session_token', token) } } catch {}
  setCookie(c, 'cashier_session', '', { httpOnly: true, secure: true, sameSite: 'Lax', maxAge: 0, path: '/' })
  return c.json({ success: true })
})

app.get('/api/caixa/debug/diagnose', async (c) => {
  const token = getCookie(c, 'cashier_session')
  if (!token) return c.json({ error: 'Não autorizado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: session } = await supabase
      .from('cashier_sessions')
      .select('id')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!session) return c.json({ error: 'Sessão expirada' }, 401)
    const cpfParam = String(c.req.query('cpf') || '').replace(/\D/g, '')
    if (!cpfParam) return c.json({ error: 'CPF inválido' }, 400)
    const { data: aff } = await supabase
      .from('affiliates')
      .select('id, full_name, cpf, is_active, created_at')
      .eq('cpf', cpfParam)
      .maybeSingle()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, cpf, mocha_user_id, is_active')
      .eq('cpf', cpfParam)
      .maybeSingle()
    const { data: coupon } = await supabase
      .from('customer_coupons')
      .select('id, coupon_code, user_id, affiliate_id, is_active, total_usage_count, last_used_at')
      .eq('coupon_code', cpfParam)
      .maybeSingle()
    const issues: string[] = []
    if (!aff && !profile) issues.push('NO_CUSTOMER_FOUND')
    if (aff && !(aff as any).is_active) issues.push('AFFILIATE_INACTIVE')
    if (!profile) issues.push('PROFILE_MISSING')
    if (!coupon) issues.push('COUPON_MISSING')
    if (coupon && !(coupon as any).is_active) issues.push('COUPON_INACTIVE')
    if (coupon && !(coupon as any).user_id) issues.push('COUPON_USER_ID_MISSING')
    return c.json({ cpf: cpfParam, affiliate: aff || null, profile: profile || null, coupon: coupon || null, issues })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.post('/api/caixa/debug/repair-coupon', async (c) => {
  const token = getCookie(c, 'cashier_session')
  if (!token) return c.json({ error: 'Não autorizado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: session } = await supabase
      .from('cashier_sessions')
      .select('id')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!session) return c.json({ error: 'Sessão expirada' }, 401)
    const body = await c.req.json().catch(() => ({}))
    const cpfParam = String((body as any)?.cpf || '').replace(/\D/g, '')
    if (!cpfParam) return c.json({ error: 'CPF inválido' }, 400)
    const { data: aff } = await supabase
      .from('affiliates')
      .select('id, cpf, full_name, is_active')
      .eq('cpf', cpfParam)
      .maybeSingle()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, cpf, mocha_user_id, is_active')
      .eq('cpf', cpfParam)
      .maybeSingle()
    let profileId: number | null = (profile as any)?.id || null
    if (!profileId && aff) {
      const { data: created } = await supabase
        .from('user_profiles')
        .upsert({ mocha_user_id: `affiliate_${(aff as any).id}`, cpf: cpfParam, role: 'affiliate', is_active: true }, { onConflict: 'mocha_user_id' })
        .select('id')
        .single()
      profileId = (created as any)?.id || null
    }
    if (!profileId) return c.json({ error: 'Perfil não encontrado', details: { cpf: cpfParam } }, 400)
    const { data: existing } = await supabase
      .from('customer_coupons')
      .select('id')
      .eq('coupon_code', cpfParam)
      .maybeSingle()
    if (!existing) {
      const { data: inserted } = await supabase
        .from('customer_coupons')
        .insert({ coupon_code: cpfParam, user_id: profileId, is_active: true })
        .select('*')
        .single()
      if (!inserted) return c.json({ error: 'Falha ao criar cupom' }, 500)
      await supabase
        .from('customer_coupons')
        .update({ cpf: cpfParam, affiliate_id: (aff as any)?.id || null })
        .eq('id', (inserted as any).id)
      return c.json({ success: true, coupon: inserted })
    } else {
      const { data: updated1 } = await supabase
        .from('customer_coupons')
        .update({ user_id: profileId, is_active: true })
        .eq('coupon_code', cpfParam)
        .select('*')
        .single()
      await supabase
        .from('customer_coupons')
        .update({ cpf: cpfParam, affiliate_id: (aff as any)?.id || null })
        .eq('coupon_code', cpfParam)
      if (!updated1) return c.json({ error: 'Falha ao atualizar cupom' }, 500)
      return c.json({ success: true, coupon: updated1 })
    }
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.post('/api/empresa/caixas', async (c) => {
  const token = getCookie(c, 'company_session')
  if (!token) return c.json({ error: 'Não autorizado' }, 401)
  try {
    const body = await c.req.json()
    const parsed = z.object({ name: z.string().min(1), cpf: z.string().min(11), password: z.string().min(6) }).safeParse(body)
    if (!parsed.success) return c.json({ error: 'Dados inválidos' }, 400)
    const supabase = createSupabase()
    const { data: session } = await supabase
      .from('company_sessions')
      .select('*, companies!inner(id)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!session) return c.json({ error: 'Não autorizado' }, 401)
    const cleanCpf = parsed.data.cpf.replace(/\D/g, '')
    const { data: existingCashier } = await supabase
      .from('company_cashiers')
      .select('id')
      .eq('company_id', (session as any).companies.id)
      .eq('cpf', cleanCpf)
      .single()
    if (existingCashier) return c.json({ error: 'CPF já cadastrado para esta empresa' }, 400)
    const { data: globalExisting } = await supabase
      .from('company_cashiers')
      .select('id, company_id')
      .eq('cpf', cleanCpf)
      .single()
    if (globalExisting && (globalExisting as any).company_id !== (session as any).companies.id) return c.json({ error: 'CPF já vinculado a outra empresa' }, 409)
    const passwordHash = await bcrypt.hash(parsed.data.password, 10)
    let { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('cpf', cleanCpf)
      .single()
    if (!userProfile) {
      const { data: createdProfile, error: profileError } = await supabase
        .from('user_profiles')
        .insert({ mocha_user_id: `cashier_${cleanCpf}_${Date.now()}`, cpf: cleanCpf, role: 'cashier', is_active: true })
        .select()
        .single()
      if (profileError || !createdProfile) return c.json({ error: 'Erro interno do servidor' }, 500)
      userProfile = createdProfile
    }
    const { error: cashierError } = await supabase
      .from('company_cashiers')
      .insert({ company_id: (session as any).companies.id, user_id: (userProfile as any).id, name: parsed.data.name, cpf: cleanCpf, password_hash: passwordHash, is_active: true })
    if (cashierError) return c.json({ error: 'Erro interno do servidor' }, 500)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.put('/api/empresa/caixas/:id', async (c) => {
  const token = getCookie(c, 'company_session')
  if (!token) return c.json({ error: 'Não autorizado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: session } = await supabase
      .from('company_sessions')
      .select('*, companies!inner(id)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!session) return c.json({ error: 'Não autorizado' }, 401)
    const id = parseInt(c.req.param('id'))
    const body = await c.req.json()
    const updateData: any = { updated_at: new Date().toISOString() }
    if ((body as any).password && String((body as any).password).length >= 6) {
      updateData.password_hash = await bcrypt.hash(String((body as any).password), 10)
      if ((body as any).name) updateData.name = (body as any).name
    } else if ((body as any).name) {
      updateData.name = (body as any).name
    }
    const { data: cashier } = await supabase
      .from('company_cashiers')
      .select('id')
      .eq('id', id)
      .eq('company_id', (session as any).companies.id)
      .single()
    if (!cashier) return c.json({ error: 'Caixa não encontrado' }, 404)
    const { error } = await supabase.from('company_cashiers').update(updateData).eq('id', id)
    if (error) return c.json({ error: 'Erro interno do servidor' }, 500)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.patch('/api/empresa/caixas/:id/toggle', async (c) => {
  const token = getCookie(c, 'company_session')
  if (!token) return c.json({ error: 'Não autorizado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: session } = await supabase
      .from('company_sessions')
      .select('*, companies!inner(id)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!session) return c.json({ error: 'Não autorizado' }, 401)
    const id = parseInt(c.req.param('id'))
    const { data: cashier } = await supabase
      .from('company_cashiers')
      .select('id, is_active')
      .eq('id', id)
      .eq('company_id', (session as any).companies.id)
      .single()
    if (!cashier) return c.json({ error: 'Caixa não encontrado' }, 404)
    const newStatus = !(cashier as any).is_active
    const { error: updErr } = await supabase
      .from('company_cashiers')
      .update({ is_active: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (updErr) return c.json({ error: 'Erro interno do servidor' }, 500)
    if (!newStatus) {
      await supabase.from('cashier_sessions').delete().eq('cashier_id', id)
    }
    return c.json({ success: true, is_active: newStatus })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.delete('/api/empresa/caixas/:id', async (c) => {
  const token = getCookie(c, 'company_session')
  if (!token) return c.json({ error: 'Não autorizado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: session } = await supabase
      .from('company_sessions')
      .select('*, companies!inner(id)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!session) return c.json({ error: 'Não autorizado' }, 401)
    const id = parseInt(c.req.param('id'))
    const { data: cashier } = await supabase
      .from('company_cashiers')
      .select('id')
      .eq('id', id)
      .eq('company_id', (session as any).companies.id)
      .single()
    if (!cashier) return c.json({ error: 'Caixa não encontrado' }, 404)
    const { count } = await supabase
      .from('company_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('cashier_id', id)
    if (count && count > 0) return c.json({ error: 'Não é possível excluir caixa com vendas registradas. Bloqueie ao invés de excluir.' }, 400)
    await supabase.from('cashier_sessions').delete().eq('cashier_id', id)
    const { error: delErr } = await supabase.from('company_cashiers').delete().eq('id', id)
    if (delErr) return c.json({ error: 'Erro interno do servidor' }, 500)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.put('/api/empresa/cashback', async (c) => {
  const token = getCookie(c, 'company_session')
  if (!token) return c.json({ error: 'Não autorizado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: session } = await supabase
      .from('company_sessions')
      .select('*, companies!inner(id)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!session) return c.json({ error: 'Não autorizado' }, 401)
    const body = await c.req.json()
    const percentage = Number((body as any).cashback_percentage)
    if (!percentage || percentage < 1 || percentage > 20) return c.json({ error: 'Percentual deve estar entre 1% e 20%' }, 400)
    const { error } = await supabase
      .from('company_cashback_config')
      .update({ cashback_percentage: percentage, updated_at: new Date().toISOString() })
      .eq('company_id', (session as any).companies.id)
    if (error) return c.json({ error: 'Erro interno do servidor' }, 500)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/empresa/caixas', async (c) => {
  const token = getCookie(c, 'company_session')
  if (!token) return c.json({ error: 'Não autorizado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: session } = await supabase
      .from('company_sessions')
      .select('*, companies!inner(id)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!session) return c.json({ error: 'Não autorizado' }, 401)
    const { data: cashiers } = await supabase
      .from('company_cashiers')
      .select('id, name, cpf, is_active, last_access_at, created_at')
      .eq('company_id', (session as any).companies.id)
      .order('created_at', { ascending: false })
    return c.json({ cashiers: cashiers || [] })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/empresa/relatorio', async (c) => {
  const token = getCookie(c, 'company_session')
  if (!token) return c.json({ error: 'Não autorizado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: session } = await supabase
      .from('company_sessions')
      .select('*, companies!inner(id)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!session) return c.json({ error: 'Não autorizado' }, 401)
    const { data: purchases } = await supabase
      .from('company_purchases')
      .select('id, customer_coupon, cashier_cpf, purchase_value, cashback_generated, purchase_date, purchase_time, company_cashiers(name)')
      .eq('company_id', (session as any).companies.id)
      .order('created_at', { ascending: false })
      .limit(100)
    const formatted = (purchases || []).map((p: any) => ({
      id: p.id,
      cashier_name: p.company_cashiers?.name || '',
      customer_coupon: p.customer_coupon,
      cashier_cpf: p.cashier_cpf,
      purchase_value: Number(p.purchase_value || 0),
      cashback_generated: Number(p.cashback_generated || 0),
      purchase_date: p.purchase_date,
      purchase_time: p.purchase_time,
    }))
    return c.json({ purchases: formatted })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/empresa/estatisticas', async (c) => {
  const token = getCookie(c, 'company_session')
  if (!token) return c.json({ error: 'Não autorizado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: session } = await supabase
      .from('company_sessions')
      .select('*, companies!inner(id)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!session) return c.json({ error: 'Não autorizado' }, 401)
    const { data: rows } = await supabase
      .from('company_purchases')
      .select('purchase_value, cashback_generated, purchase_date')
      .eq('company_id', (session as any).companies.id)
    const total = (rows || []).reduce((acc: any, r: any) => ({
      sales_count: acc.sales_count + 1,
      sales_value: acc.sales_value + Number(r.purchase_value || 0),
      cashback_generated: acc.cashback_generated + Number(r.cashback_generated || 0),
    }), { sales_count: 0, sales_value: 0, cashback_generated: 0 })
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth()+1, 1).toISOString().split('T')[0]
    const monthly = (rows || []).reduce((acc: any, r: any) => {
      const d = String(r.purchase_date || '')
      if (d >= monthStart && d < nextMonthStart) {
        acc.sales_count += 1
        acc.sales_value += Number(r.purchase_value || 0)
        acc.cashback_generated += Number(r.cashback_generated || 0)
      }
      return acc
    }, { sales_count: 0, sales_value: 0, cashback_generated: 0 })
    const { data: cfg } = await supabase
      .from('company_cashback_config')
      .select('cashback_percentage')
      .eq('company_id', (session as any).companies.id)
      .single()
    return c.json({ total, monthly, cashback_percentage: (cfg as any)?.cashback_percentage ?? 5.0 })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/empresa/dados-mensais', async (c) => {
  const token = getCookie(c, 'company_session')
  if (!token) return c.json({ error: 'Não autorizado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: session } = await supabase
      .from('company_sessions')
      .select('*, companies!inner(id)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!session) return c.json({ error: 'Não autorizado' }, 401)
    const startDate = new Date(); startDate.setMonth(startDate.getMonth() - 6)
    const startStr = startDate.toISOString().split('T')[0]
    const { data: rows } = await supabase
      .from('company_purchases')
      .select('purchase_date, purchase_value, cashback_generated')
      .eq('company_id', (session as any).companies.id)
      .gte('purchase_date', startStr)
      .order('purchase_date', { ascending: true })
    const agg = new Map<string, { sales_count: number; sales_value: number; cashback_generated: number }>()
    for (const row of rows || []) {
      const key = String((row as any).purchase_date).slice(0, 7)
      const curr = agg.get(key) || { sales_count: 0, sales_value: 0, cashback_generated: 0 }
      curr.sales_count += 1
      curr.sales_value += Number((row as any).purchase_value || 0)
      curr.cashback_generated += Number((row as any).cashback_generated || 0)
      agg.set(key, curr)
    }
    const monthly_data = Array.from(agg.entries()).map(([month, v]) => ({
      month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      sales_count: v.sales_count,
      sales_value: v.sales_value,
      cashback_generated: v.cashback_generated,
    }))
    return c.json({ monthly_data })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

const CompanyRegisterSchema = z.object({
  razao_social: z.string().min(1),
  nome_fantasia: z.string().min(1),
  cnpj: z.string().min(14),
  email: z.string().email(),
  telefone: z.string().min(10),
  responsavel: z.string().min(1),
  senha: z.string().min(6),
  endereco: z.string().optional(),
  site_instagram: z.string().optional(),
})

app.post('/api/empresa/registrar', async (c) => {
  try {
    const data = CompanyRegisterSchema.parse(await c.req.json())
    const supabase = createSupabase()
    const cleanCnpj = String(data.cnpj).replace(/\D/g, '')
    if (cleanCnpj.length !== 14 || /^([0-9])\1{13}$/.test(cleanCnpj)) return c.json({ error: 'CNPJ inválido' }, 400)
    const { data: existingEmail } = await supabase.from('companies').select('id').eq('email', data.email).maybeSingle()
    if (existingEmail) return c.json({ error: 'Email já cadastrado' }, 409)
    const { data: existingCnpj } = await supabase.from('companies').select('id').eq('cnpj', cleanCnpj).maybeSingle()
    if (existingCnpj) return c.json({ error: 'CNPJ já cadastrado' }, 409)
    const passwordHash = await bcrypt.hash(data.senha, 10)
    const nowIso = new Date().toISOString()
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert({
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        cnpj: cleanCnpj,
        email: data.email,
        telefone: String(data.telefone).replace(/\D/g, ''),
        responsavel: data.responsavel,
        senha_hash: passwordHash,
        endereco: data.endereco || '',
        site_instagram: data.site_instagram || '',
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select()
      .single()
    if (companyError || !newCompany) return c.json({ error: 'Erro interno do servidor' }, 500)
    const { error: configError } = await supabase
      .from('company_cashback_config')
      .insert({ company_id: (newCompany as any).id, cashback_percentage: 5.0 })
    if (configError) {}
    return c.json({ success: true, message: 'Empresa cadastrada com sucesso!' })
  } catch (error) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/network/members', async (c) => {
  const token = getCookie(c, 'affiliate_session')
  if (!token) return c.json({ error: 'Não autenticado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: sessionData } = await supabase
      .from('affiliate_sessions')
      .select('affiliate_id, affiliates!inner(id, cpf)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single()
    if (!sessionData) return c.json({ error: 'Sessão expirada' }, 401)
    const rootId = (sessionData as any).affiliates.id as number
    async function getLevel(sponsorId: number, level: number, maxLevel: number): Promise<any[]> {
      if (level > maxLevel) return []
      const { data: direct } = await supabase
        .from('affiliates')
        .select('id,email,cpf,created_at,last_access_at')
        .eq('sponsor_id', sponsorId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      const rows = [] as any[]
      for (const m of direct || []) {
        const isActive = (m as any).last_access_at ? new Date((m as any).last_access_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : false
        const { count: purchases } = await supabase
          .from('company_purchases')
          .select('id', { count: 'exact', head: true })
          .eq('customer_coupon', (m as any).cpf || '')
        rows.push({ id: (m as any).id, email: (m as any).email, cpf: (m as any).cpf || 'N/A', level, is_active_this_month: isActive, last_purchase_date: (m as any).last_access_at || (m as any).created_at, total_purchases: purchases || 0, created_at: (m as any).created_at })
        const subs = await getLevel((m as any).id, level + 1, maxLevel)
        rows.push(...subs)
      }
      return rows
    }
    const members = await getLevel(rootId, 1, 10)
    return c.json(members)
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/network/stats', async (c) => {
  const token = getCookie(c, 'affiliate_session')
  if (!token) return c.json({ error: 'Não autenticado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: sessionData } = await supabase
      .from('affiliate_sessions')
      .select('affiliate_id, affiliates!inner(id)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single()
    if (!sessionData) return c.json({ error: 'Sessão expirada' }, 401)
    const rootId = (sessionData as any).affiliates.id as number
    async function countLevels(sponsorId: number, level: number, maxLevel: number, acc: Record<number, number>) {
      if (level > maxLevel) return
      const { data: direct } = await supabase
        .from('affiliates')
        .select('id,last_access_at')
        .eq('sponsor_id', sponsorId)
        .eq('is_active', true)
      acc[level] = (acc[level] || 0) + (direct?.length || 0)
      for (const m of direct || []) {
        await countLevels((m as any).id, level + 1, maxLevel, acc)
      }
    }
    async function countActive(sponsorId: number, level: number, maxLevel: number): Promise<number> {
      if (level > maxLevel) return 0
      const { data: direct } = await supabase
        .from('affiliates')
        .select('id,last_access_at')
        .eq('sponsor_id', sponsorId)
        .eq('is_active', true)
      let active = 0
      for (const m of direct || []) {
        const isActive = (m as any).last_access_at ? new Date((m as any).last_access_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : false
        if (isActive) active++
        active += await countActive((m as any).id, level + 1, maxLevel)
      }
      return active
    }
    const levelCounts: Record<number, number> = {}
    await countLevels(rootId, 1, 10, levelCounts)
    const totalActive = await countActive(rootId, 1, 10)
    const totalMembers = Object.values(levelCounts).reduce((s, n) => s + n, 0)
    return c.json({
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
      total_inactive: totalMembers - totalActive,
    })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/affiliate/network/preference', async (c) => {
  const token = getCookie(c, 'affiliate_session')
  if (!token) return c.json({ preference: 'auto' })
  try {
    const supabase = createSupabase()
    const { data: sessionData } = await supabase
      .from('affiliate_sessions')
      .select('affiliate_id, affiliates!inner(id)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single()
    if (!sessionData) return c.json({ preference: 'auto' })
    const affiliateId = (sessionData as any).affiliates.id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('mocha_user_id', `affiliate_${affiliateId}`)
      .single()
    if (!profile) return c.json({ preference: 'auto' })
    const { data: settings } = await supabase
      .from('user_settings')
      .select('leg_preference')
      .eq('user_id', (profile as any).id)
      .single()
    const prefRaw = (settings as any)?.leg_preference || 'automatic'
    const prefNorm = normalizeLegPreference(prefRaw)
    const apiPref = prefNorm === 'automatic' ? 'auto' : prefNorm
    return c.json({ preference: apiPref, preference_raw: prefRaw, preference_normalized: prefNorm })
  } catch (e) {
    return c.json({ preference: 'auto' })
  }
})

app.get('/api/affiliate/network/placement-preview', async (c) => {
  const token = getCookie(c, 'affiliate_session')
  if (!token) return c.json({ error: 'Não autenticado' }, 401)
  try {
    const supabase = createSupabase()
    const { data: sessionData } = await supabase
      .from('affiliate_sessions')
      .select('affiliate_id, affiliates!inner(id)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single()
    if (!sessionData) return c.json({ error: 'Sessão expirada' }, 401)
    const sponsorId = (sessionData as any).affiliates.id as number
    const pref = await getSponsorPreference(supabase, sponsorId)
    const idx = pref === 'automatic' ? null : LEG_TO_SLOT[pref as 'left' | 'center' | 'right']
    const targetParentId = await findPlacementTarget(supabase, sponsorId, pref)
    let slotVacant: boolean | null = null
    if (idx !== null && idx !== undefined) {
      const child = await getChildInSlot(supabase, targetParentId, idx)
      slotVacant = child === null
    }
    return c.json({ sponsorId, preference: pref, targetParentId, targetSlotIndex: idx, slotVacant })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.put('/api/affiliate/network/preference', async (c) => {
  const token = getCookie(c, 'affiliate_session')
  if (!token) return c.json({ error: 'Não autenticado' }, 401)
  try {
    const body = await c.req.json()
    const supabase = createSupabase()
    const { data: sessionData } = await supabase
      .from('affiliate_sessions')
      .select('affiliate_id, affiliates!inner(id)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single()
    if (!sessionData) return c.json({ error: 'Sessão expirada' }, 401)
    const affiliateId = (sessionData as any).affiliates.id
    const pref = (body.preference === 'auto' ? 'automatic' : body.preference) as string
    let { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('mocha_user_id', `affiliate_${affiliateId}`)
      .single()
    if (!profile) {
      const { data: newProfile } = await supabase
        .from('user_profiles')
        .insert({ mocha_user_id: `affiliate_${affiliateId}`, role: 'affiliate', is_active: true })
        .select()
        .single()
      profile = newProfile
    }
    const { error: upErr } = await supabase
      .from('user_settings')
      .upsert({ user_id: (profile as any).id, leg_preference: pref, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (upErr) return c.json({ error: 'Erro interno do servidor' }, 500)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

app.get('/api/affiliate/network/tree', async (c) => {
  const token = getCookie(c, 'affiliate_session')
  if (!token) return c.json({ error: 'Não autenticado' }, 401)
  try {
    const supabase = createSupabase()
    const depthParam = c.req.query('max_depth')
    const maxDepth = Math.max(1, Math.min(10, parseInt(depthParam || '3')))
    const { data: sessionData } = await supabase
      .from('affiliate_sessions')
      .select('affiliate_id, affiliates!inner(id, full_name, cpf, created_at, last_access_at)')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single()
    if (!sessionData) return c.json({ error: 'Sessão expirada' }, 401)
    const root = (sessionData as any).affiliates
    async function buildNode(affiliateId: number, level: number): Promise<any> {
      const { data: aff } = await supabase
        .from('affiliates')
        .select('id, full_name, cpf, created_at, last_access_at, position_slot')
        .eq('id', affiliateId)
        .single()
      const isActive = (aff as any)?.last_access_at ? new Date((aff as any).last_access_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : false
      const { count: directCount } = await supabase
        .from('affiliates')
        .select('id', { count: 'exact', head: true })
        .eq('sponsor_id', affiliateId)
        .eq('is_active', true)
      const node: any = {
        id: affiliateId.toString(),
        name: (aff as any)?.full_name || 'Afiliado',
        coupon: (aff as any)?.cpf || '',
        active: isActive,
        level,
        cpf: (aff as any)?.cpf || '',
        direct_referrals: directCount || 0,
        signup_date: (aff as any)?.created_at,
        position_slot: (aff as any)?.position_slot ?? null,
        children: [] as any[],
      }
      if (level >= maxDepth) return node
      const { data: direct } = await supabase
        .from('affiliates')
        .select('id, position_slot, created_at')
        .eq('sponsor_id', affiliateId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      const slots: (number | null)[] = [null, null, null]
      for (const m of direct || []) {
        const ps = (m as any).position_slot
        if ((ps === 0 || ps === 1 || ps === 2) && slots[ps] === null) {
          slots[ps] = (m as any).id
        } else {
          for (let i = 0; i < 3; i++) {
            if (slots[i] === null) { slots[i] = (m as any).id; break }
          }
        }
      }
      for (let i = 0; i < 3; i++) {
        if (slots[i] !== null) {
          const childNode = await buildNode(slots[i] as number, level + 1)
          node.children.push(childNode)
        }
      }
      return node
    }
    const tree = await buildNode(root.id, 0)
    return c.json(tree)
  } catch (e) {
    return c.json({ error: 'Erro interno do servidor' }, 500)
  }
})

Deno.serve(app.fetch)
