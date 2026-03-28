export async function authenticatedFetch(input: RequestInfo, init?: RequestInit) {
  const url = typeof input === 'string' ? input : (input as Request).url
  const headers = new Headers(init?.headers || {})
  
  // Get all potential tokens
  const affiliateToken = localStorage.getItem('affiliate_token')
  const adminToken = localStorage.getItem('admin_token')
  const companyToken = localStorage.getItem('company_token')
  const cashierToken = localStorage.getItem('cashier_token')
  
  // Choose the appropriate token based on the route
  let token = affiliateToken
  
  if (url.startsWith('/api/admin')) {
    token = adminToken
  } else if (url.startsWith('/api/empresa')) {
    token = companyToken
  } else if (url.startsWith('/api/caixa')) {
    token = cashierToken
  }
  
  // If no specific token found for route, try ANY token as a fallback for /api routes
  if (!token && url.startsWith('/api')) {
    token = affiliateToken || adminToken || companyToken || cashierToken
  }

  if (token) {
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
    headers.set('x-session-token', token)
    headers.set('X-Session-Token', token)
  }
  
  return fetch(input, { ...(init || {}), headers, credentials: 'omit' })
}
