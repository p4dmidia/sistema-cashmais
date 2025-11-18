// supabase/functions/api/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
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

serve(app.fetch)
