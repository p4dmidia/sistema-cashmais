export async function authenticatedFetch(input: RequestInfo, init?: RequestInit) {
  const url = typeof input === 'string' ? input : (input as Request).url
  const headers = new Headers(init?.headers || {})
  const token = localStorage.getItem('affiliate_token') || localStorage.getItem('admin_token')
  if (url.startsWith('/api') && token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return fetch(input, { ...(init || {}), headers, credentials: 'omit' })
}

