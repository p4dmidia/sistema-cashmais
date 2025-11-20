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

app.use('*', cors({
  origin: (origin) => origin || '*',
  allowHeaders: ['Authorization', 'Content-Type', 'X-Client-Info', 'Cookie'],
  allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
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
    setCookie(c, 'admin_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 24 * 60 * 60,
      path: '/',
    })
    await supabase
      .from('admin_audit_logs')
      .insert({ admin_user_id: (adminUser as any).id, action: 'LOGIN', entity_type: 'admin_session' })
    return c.json({ success: true, admin: { id: (adminUser as any).id, username: (adminUser as any).username, email: (adminUser as any).email, full_name: (adminUser as any).full_name } })
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

app.post('/admin/logout', async (c) => {
  try {
    const token = getCookie(c, 'admin_session')
    const supabase = createSupabase()
    if (token) await supabase.from('admin_sessions').delete().eq('session_token', token)
    setCookie(c, 'admin_session', '', { httpOnly: true, secure: true, sameSite: 'None', maxAge: 0, path: '/' })
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

app.get('/admin/withdrawals', async (c) => {
  try {
    const status = c.req.query('status') || 'pending'
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = (page - 1) * limit
    const supabase = createSupabase()
    const { data: rows, count } = await supabase
      .from('withdrawals')
      .select('id, amount_requested, fee_amount, net_amount, status, pix_key, created_at, affiliate_id, affiliates!inner(full_name,cpf,email)', { count: 'exact' })
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

app.get('/admin/reports/companies', async (c) => {
  try {
    const supabase = createSupabase()
    const { data } = await supabase.from('companies').select('id,nome_fantasia').order('nome_fantasia', { ascending: true })
    return c.json({ companies: data || [] })
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

app.post('/affiliate/login', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = AffiliateLoginSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Dados inválidos' }, 400)
    const cleanCpf = parsed.data.cpf.replace(/\D/g, '')
    if (!validateCPF(cleanCpf)) return c.json({ error: 'CPF inválido' }, 422)
    const supabase = createSupabase()
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('cpf', cleanCpf)
      .eq('is_active', true)
      .single()
    if (!affiliate) return c.json({ error: 'CPF ou senha inválidos' }, 401)
    let storedHash = (affiliate as any).password_hash as string | null
    if (!storedHash) {
      const newHash = await bcrypt.hash(parsed.data.password, 12)
      await supabase.from('affiliates').update({ password_hash: newHash, updated_at: new Date().toISOString() }).eq('id', (affiliate as any).id)
      storedHash = newHash
    }
    const valid = await bcrypt.compare(parsed.data.password, storedHash as string)
    if (!valid) return c.json({ error: 'CPF ou senha inválidos' }, 401)
    const sessionToken = crypto.randomUUID() + '-' + Date.now()
    const expiresAt = getSessionExpiration()
    await supabase.from('affiliate_sessions').delete().eq('affiliate_id', (affiliate as any).id)
    await supabase.from('affiliate_sessions').insert({ affiliate_id: (affiliate as any).id, session_token: sessionToken, expires_at: expiresAt.toISOString() })
    setCookie(c, 'affiliate_session', sessionToken, { httpOnly: true, secure: true, sameSite: 'None', path: '/', maxAge: 30 * 24 * 60 * 60 })
    return c.json({ success: true, affiliate: { id: (affiliate as any).id, full_name: (affiliate as any).full_name, email: (affiliate as any).email, referral_code: (affiliate as any).referral_code, customer_coupon: (affiliate as any).cpf } })
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
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('cpf', cleanCpf)
      .eq('is_active', true)
      .single()
    if (!affiliate) return c.json({ error: 'CPF ou senha inválidos' }, 401)
    let storedHash = (affiliate as any).password_hash as string | null
    if (!storedHash) {
      const newHash = await bcrypt.hash(parsed.data.password, 12)
      await supabase.from('affiliates').update({ password_hash: newHash, updated_at: new Date().toISOString() }).eq('id', (affiliate as any).id)
      storedHash = newHash
    }
    const valid = await bcrypt.compare(parsed.data.password, storedHash as string)
    if (!valid) return c.json({ error: 'CPF ou senha inválidos' }, 401)
    const sessionToken = crypto.randomUUID() + '-' + Date.now()
    const expiresAt = getSessionExpiration()
    await supabase.from('affiliate_sessions').delete().eq('affiliate_id', (affiliate as any).id)
    await supabase.from('affiliate_sessions').insert({ affiliate_id: (affiliate as any).id, session_token: sessionToken, expires_at: expiresAt.toISOString() })
    setCookie(c, 'affiliate_session', sessionToken, { httpOnly: true, secure: true, sameSite: 'None', path: '/', maxAge: 30 * 24 * 60 * 60 })
    return c.json({ success: true, affiliate: { id: (affiliate as any).id, full_name: (affiliate as any).full_name, email: (affiliate as any).email, referral_code: (affiliate as any).referral_code, customer_coupon: (affiliate as any).cpf } })
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

app.post('/affiliate/logout', async (c) => {
  const token = getCookie(c, 'affiliate_session')
  try {
    if (token) {
      const supabase = createSupabase()
      await supabase.from('affiliate_sessions').delete().eq('session_token', token)
    }
  } catch {}
  setCookie(c, 'affiliate_session', '', { httpOnly: true, secure: true, sameSite: 'None', path: '/', maxAge: 0 })
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
  setCookie(c, 'affiliate_session', '', { httpOnly: true, secure: true, sameSite: 'None', path: '/', maxAge: 0 })
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
    let totalCommissions = 0
    const { data: purchaseTransactions } = await supabase
      .from('company_purchases')
      .select('cashback_generated')
      .eq('customer_coupon', affiliate.cpf)
    const purchaseCashback = (purchaseTransactions || []).reduce((s: number, tx: any) => s + (tx.cashback_generated * 0.07), 0)
    totalCommissions = Math.round(purchaseCashback * 100) / 100
    let { data: profileData } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('mocha_user_id', `affiliate_${affiliate.id}`)
      .single()
    if (!profileData) {
      const { data: newProfile } = await supabase
        .from('user_profiles')
        .insert({ mocha_user_id: `affiliate_${affiliate.id}`, cpf: affiliate.cpf || '', role: 'affiliate', is_active: true })
        .select()
        .single()
      profileData = newProfile
    }
    const profile = profileData
    const { data: withdrawalData } = await supabase
      .from('withdrawals')
      .select('amount_requested')
      .eq('user_id', (profile as any).id)
      .eq('status', 'approved')
    const totalWithdrawn = (withdrawalData || []).reduce((s: number, w: any) => s + (w.amount_requested || 0), 0)
    const { data: frozenData } = await supabase
      .from('withdrawals')
      .select('amount_requested')
      .eq('user_id', (profile as any).id)
      .eq('status', 'pending')
    const frozenBalance = (frozenData || []).reduce((s: number, w: any) => s + (w.amount_requested || 0), 0)
    const availableBalance = Math.max(0, totalCommissions - totalWithdrawn - frozenBalance)
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
    const { error: upErr } = await supabase
      .from('user_settings')
      .upsert({ user_id: (profile as any).id, pix_key: body.pix_key, leg_preference: body.leg_preference, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (upErr) return c.json({ error: 'Erro interno do servidor' }, 500)
    return c.json({ success: true })
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
    setCookie(c, 'company_session', sessionToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 24 * 60 * 60, path: '/' })
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
  setCookie(c, 'company_session', '', { httpOnly: true, secure: true, sameSite: 'None', maxAge: 0, path: '/' })
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
    const ok = await bcrypt.compare((body as any).password, (cashier as any).password_hash as string)
    if (!ok) return c.json({ error: 'CPF ou senha inválidos' }, 401)
    await supabase.from('company_cashiers').update({ last_access_at: new Date().toISOString() }).eq('id', (cashier as any).id)
    const sessionToken = crypto.randomUUID().replace(/-/g, '')
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000)
    await supabase.from('cashier_sessions').insert({ cashier_id: (cashier as any).id, session_token: sessionToken, expires_at: expiresAt.toISOString() })
    setCookie(c, 'cashier_session', sessionToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 8 * 60 * 60, path: '/' })
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
    return c.json({ id: cx.id, name: cx.name, cpf: cx.cpf, company_name: (cx as any).companies.nome_fantasia, company_id: (cx as any).companies.id, user_id: (session as any).company_cashiers.user_id })
  } catch (e) { return c.json({ error: 'Erro interno do servidor' }, 500) }
})

app.post('/api/caixa/logout', async (c) => {
  const token = getCookie(c, 'cashier_session')
  try { if (token) { const supabase = createSupabase(); await supabase.from('cashier_sessions').delete().eq('session_token', token) } } catch {}
  setCookie(c, 'cashier_session', '', { httpOnly: true, secure: true, sameSite: 'None', maxAge: 0, path: '/' })
  return c.json({ success: true })
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
    const pref = (settings as any)?.leg_preference || 'automatic'
    const apiPref = pref === 'automatic' ? 'auto' : pref
    return c.json({ preference: apiPref })
  } catch (e) {
    return c.json({ preference: 'auto' })
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
      const isActive = root.last_access_at ? new Date(root.last_access_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : false
      const { count: directCount } = await supabase
        .from('affiliates')
        .select('id', { count: 'exact', head: true })
        .eq('sponsor_id', affiliateId)
        .eq('is_active', true)
      const node: any = {
        id: affiliateId.toString(),
        name: root.full_name || 'Você',
        coupon: root.cpf || '',
        active: isActive,
        level,
        cpf: root.cpf || '',
        direct_referrals: directCount || 0,
        signup_date: root.created_at,
        children: [] as any[],
      }
      if (level >= maxDepth) return node
      const { data: direct } = await supabase
        .from('affiliates')
        .select('id, full_name, cpf, created_at, last_access_at')
        .eq('sponsor_id', affiliateId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      for (const m of direct || []) {
        const isActiveM = (m as any).last_access_at ? new Date((m as any).last_access_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : false
        const { count: directCountM } = await supabase
          .from('affiliates')
          .select('id', { count: 'exact', head: true })
          .eq('sponsor_id', (m as any).id)
          .eq('is_active', true)
        const child = {
          id: ((m as any).id).toString(),
          name: (m as any).full_name || 'Afiliado',
          coupon: (m as any).cpf || '',
          active: isActiveM,
          level: level + 1,
          cpf: (m as any).cpf || '',
          direct_referrals: directCountM || 0,
          signup_date: (m as any).created_at,
          children: [] as any[],
        }
        if (level + 1 < maxDepth) {
          const subChildren = await supabase
            .from('affiliates')
            .select('id, full_name, cpf, created_at, last_access_at')
            .eq('sponsor_id', (m as any).id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
          for (const s of subChildren.data || []) {
            const isActiveS = (s as any).last_access_at ? new Date((s as any).last_access_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : false
            child.children.push({
              id: ((s as any).id).toString(),
              name: (s as any).full_name || 'Afiliado',
              coupon: (s as any).cpf || '',
              active: isActiveS,
              level: level + 2,
              cpf: (s as any).cpf || '',
              direct_referrals: 0,
              signup_date: (s as any).created_at,
              children: [] as any[],
            })
          }
        }
        node.children.push(child)
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
