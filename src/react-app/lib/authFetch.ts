export async function authenticatedFetch(input: RequestInfo, init?: RequestInit) {
  const url = typeof input === 'string' ? input : (input as Request).url
  const headers = new Headers(init?.headers || {})
  const token = localStorage.getItem('affiliate_token') || localStorage.getItem('admin_token')
  if (url.startsWith('/api') && token) {
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
    if (!headers.has('X-Session-Token')) headers.set('X-Session-Token', token)
    if (!headers.has('x-session-token')) headers.set('x-session-token', token)
  }
  return fetch(input, { ...(init || {}), headers, credentials: 'omit' })
}
