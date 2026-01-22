import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const supabase = createClient(url, key)
  const headerAdminToken = req.headers['x-admin-token'] || ''
  const xSessionToken = req.headers['x-session-token'] || ''
  const authHeader = req.headers['authorization'] || ''
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''
  const cookie = req.headers['cookie'] || ''
  const cookieMatch = cookie.match(/(?:^|;\s*)admin_session=([^;]+)/)
  const cookieToken = cookieMatch ? cookieMatch[1] : ''
  const token = headerAdminToken || xSessionToken || bearer || cookieToken || ''

  // Validate admin session
  try {
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('id')
      .eq('session_token', token)
      .maybeSingle()
    if (!session) {
      return res.status(401).json({ error: 'SESSÃO_BLOQUEADA_PELO_ARQUIVO_API_ADMIN_AFFILIATES', debug_token_recebido: token })
    }
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erro interno' })
  }

  const page = parseInt((req.query.page || '1'), 10)
  const limit = parseInt((req.query.limit || '20'), 10)
  const search = (req.query.search || '').toString()
  const offset = (page - 1) * limit

  try {
    let query = supabase
      .from('affiliates')
      .select('id, full_name, email, cpf, phone, referral_code, sponsor_id, is_active, is_verified, created_at, last_access_at', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (search) {
      const term = `%${search}%`
      query = query.or(`full_name.ilike.${term},email.ilike.${term},cpf.ilike.${term}`)
    }
    const { data: rows, count: totalCountValue } = await query.range(offset, offset + limit - 1)
    console.log('[API_ADMIN_AFFILIATES] Query result:', { page, limit, offset, totalCountValue, rowsLength: (rows || []).length })
    let affiliates = rows || []
    if ((totalCountValue || 0) > 0 && affiliates.length === 0) {
      const { data: fallbackRows } = await (search ? query : supabase
        .from('affiliates')
        .select('id, full_name, email, cpf, phone, referral_code, sponsor_id, is_active, is_verified, created_at, last_access_at')
        .order('created_at', { ascending: false })
      ).limit(limit)
      affiliates = fallbackRows || []
      console.log('[API_ADMIN_AFFILIATES] Fallback rows length:', affiliates.length)
    }

    // Enrich
    const enriched = []
    for (const a of affiliates) {
      const { count: directReferrals } = await supabase
        .from('affiliates')
        .select('*', { count: 'exact', head: true })
        .eq('sponsor_id', a.id)
      let totalCashback = 0
      if (a.cpf) {
        const { data: cbRows } = await supabase
          .from('company_purchases')
          .select('cashback_generated')
          .eq('customer_coupon', a.cpf)
        totalCashback = (cbRows || []).reduce((sum, r) => sum + Number(r.cashback_generated || 0), 0)
      }
      enriched.push({
        id: a.id,
        full_name: a.full_name,
        email: a.email,
        cpf: a.cpf,
        whatsapp: a.phone || null,
        referral_code: a.referral_code,
        sponsor_id: a.sponsor_id,
        is_active: Boolean(a.is_active),
        is_verified: Boolean(a.is_verified),
        created_at: a.created_at,
        last_access_at: a.last_access_at || null,
        direct_referrals: directReferrals || 0,
        total_cashback: totalCashback,
        pending_commissions: totalCashback * 0.7
      })
    }

    return res.status(200).json({
      affiliates: enriched,
      pagination: {
        page,
        limit,
        total: totalCountValue || 0,
        totalPages: Math.ceil((totalCountValue || 0) / limit)
      },
      debug_total_rows: enriched.length
    })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erro interno', affiliates: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })
  }
}
