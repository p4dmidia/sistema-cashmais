export default async function handler(req, res) {
  try {
    const base =
      process.env.SUPABASE_EDGE_URL ||
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      ''
    if (!base) {
      return res.status(500).json({ error: 'SUPABASE_EDGE_URL/SUPABASE_URL não definido' })
    }
    const path = (req.query?.path || '').toString()
    const url = `${base.replace(/\/$/, '')}/functions/v1/api${path ? '/' + path : ''}`
    const apikey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      ''
    const clientX = req.headers['x-session-token'] || ''
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(apikey ? { apikey, Authorization: `Bearer ${apikey}` } : {}),
      ...(clientX ? { 'x-session-token': clientX } : {}),
    }
    const init = {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body || {}),
    }
    const response = await fetch(url, init)
    const contentType = response.headers.get('content-type') || ''
    const text = await response.text()
    res.status(response.status)
    if (contentType.includes('application/json')) {
      try {
        return res.json(JSON.parse(text))
      } catch {
        return res.send(text)
      }
    }
    return res.send(text)
  } catch (e) {
    return res.status(502).json({ error: 'Proxy error', details: String(e) })
  }
}
