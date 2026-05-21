export default async function handler(req, res) {
  try {
    const base =
      process.env.SUPABASE_EDGE_URL ||
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      ''
    if (!base) {
      return res.status(500).json({ error: 'SUPABASE_EDGE_URL/SUPABASE_URL não definido' })
    }
    const { path, ...queryParams } = req.query || {};
    const queryString = new URLSearchParams(queryParams).toString();
    const url = `${base.replace(/\/$/, '')}/functions/v1/api${path ? '/' + path : ''}${queryString ? '?' + queryString : ''}`;
    const apikey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      ''
    let clientX = req.headers['x-session-token'] || req.headers['X-Session-Token'] || ''
    if (!clientX) {
      const authHeader = req.headers['authorization'] || ''
      if (authHeader.toLowerCase().startsWith('bearer ')) {
        const token = authHeader.slice(7).trim()
        if (token && !token.startsWith('eyJ')) {
          clientX = token
        }
      }
    }
    const cookie = req.headers['cookie'] || ''
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(apikey ? { apikey, Authorization: `Bearer ${apikey}` } : {}),
      ...(clientX ? { 'x-session-token': clientX } : {}),
      ...(cookie ? { 'Cookie': cookie } : {}),
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
    
    // Forward cookies set by the backend
    const setCookies = response.headers.getSetCookie ? response.headers.getSetCookie() : null
    if (setCookies && setCookies.length > 0) {
      res.setHeader('Set-Cookie', setCookies)
    } else {
      const singleSetCookie = response.headers.get('set-cookie')
      if (singleSetCookie) {
        res.setHeader('Set-Cookie', singleSetCookie)
      }
    }

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
