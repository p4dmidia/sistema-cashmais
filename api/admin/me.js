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
  try {
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('*, admin_users!inner(username,email,full_name,is_active)')
      .eq('session_token', token)
      .maybeSingle()
    if (!session) {
      return res.status(401).json({ error: 'SESSÃO_BLOQUEADA_PELO_ARQUIVO_API_ADMIN_ME', debug_token_recebido: token, debug_header_admin: headerAdminToken })
    }
    return res.status(200).json({
      admin: {
        id: session.admin_user_id,
        username: session.admin_users.username,
        email: session.admin_users.email,
        full_name: session.admin_users.full_name
      }
    })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erro interno', stack: e.stack || '' })
  }
}
