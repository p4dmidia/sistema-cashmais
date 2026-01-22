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
  let found = false
  try {
    const { data } = await supabase
      .from('admin_sessions')
      .select('id')
      .eq('session_token', token)
      .maybeSingle()
    found = !!data
  } catch {}
  return res.status(200).json({
    token_source: headerAdminToken ? 'x-admin-token' : (xSessionToken ? 'x-session-token' : (bearer ? 'authorization' : (cookieToken ? 'cookie' : 'none'))),
    token_preview: token ? token.slice(0, 12) + '...' : 'none',
    supabase_url_preview: url ? url.replace(/^https?:\/\//, '').split('.')[0] : 'none',
    service_role_key_present: !!key,
    session_lookup_found: found
  })
}
