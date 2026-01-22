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

  // Validate session
  try {
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('id')
      .eq('session_token', token)
      .maybeSingle()
    if (!session) {
      return res.status(401).json({ error: 'SESSÃO_BLOQUEADA_PELO_ARQUIVO_API_ADMIN_AFFILIATES_STATS', debug_token_recebido: token })
    }
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erro interno' })
  }

  try {
    const { count: totalActive } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
    const { count: totalInactive } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false)
    const { data: cbRows } = await supabase
      .from('company_purchases')
      .select('cashback_generated')
    const totalCashbackGenerated = (cbRows || []).reduce((sum, r) => sum + Number(r.cashback_generated || 0), 0)
    const totalCommissionsPending = totalCashbackGenerated * 0.70
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0]
    const { count: newAffiliatesThisMonth } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart)
      .lt('created_at', nextMonthStart)

    return res.status(200).json({
      totalActive: totalActive || 0,
      totalInactive: totalInactive || 0,
      totalCashbackGenerated,
      totalCommissionsPending,
      newAffiliatesThisMonth: newAffiliatesThisMonth || 0
    })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erro interno' })
  }
}
