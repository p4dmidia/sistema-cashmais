import { useEffect, useState } from 'react';
import { authenticatedFetch } from '@/react-app/lib/authFetch';
import { useNavigate } from 'react-router';

export interface AuthUser {
  id: number;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  profile?: {
    role: string;
  };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Tentar Admin
      const adminToken = localStorage.getItem('admin_token');
      if (adminToken) {
        const response = await authenticatedFetch('/api/admin/me');
        if (response.ok) {
          const data = await response.json();
          setUser({
            ...data.admin,
            profile: { role: 'admin' }
          });
          setLoading(false);
          return;
        }
      }

      // Tentar Afiliado
      const affToken = localStorage.getItem('affiliate_token');
      if (affToken) {
        const response = await authenticatedFetch('/api/affiliate/me');
        if (response.ok) {
          const data = await response.json();
          setUser({
            ...data,
            profile: { role: 'affiliate' }
          });
          setLoading(false);
          return;
        }
      }

      // Tentar Empresa
      const companyToken = localStorage.getItem('company_token');
      if (companyToken) {
        const response = await authenticatedFetch('/api/empresa/me');
        if (response.ok) {
          const data = await response.json();
          setUser({
            ...data.company || data,
            profile: { role: 'company' }
          });
          setLoading(false);
          return;
        }
      }

      // Tentar Caixa
      const cashierToken = localStorage.getItem('cashier_token');
      if (cashierToken) {
        const response = await authenticatedFetch('/api/caixa/me');
        if (response.ok) {
          const data = await response.json();
          setUser({
            ...data.cashier,
            profile: { role: 'cashier' }
          });
          setLoading(false);
          return;
        }
      }

      setUser(null);
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const role = user?.profile?.role;
    try {
      let endpoint = '/api/affiliate/logout';
      if (role === 'admin') endpoint = '/api/admin/logout';
      if (role === 'company') endpoint = '/api/empresa/logout';
      if (role === 'cashier') endpoint = '/api/caixa/logout';
      
      await authenticatedFetch(endpoint, { method: 'POST' });
    } catch {}
    localStorage.clear();
    setUser(null);
    
    if (role === 'company' || role === 'cashier') {
      window.location.href = '/empresa/login';
    } else {
      window.location.href = '/login';
    }
  };

  return { user, loading, logout, checkAuth };
}

// Mantendo as outras funções para compatibilidade se necessário
export function useAffiliateAuth() {
  return useAuth();
}

export function useCompanyAuth() {
  return useAuth();
}

export function setupAuthInterceptor() {
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url);
    if (url.includes('/api/')) {
      const headers = new Headers(init?.headers || {});
      const token = 
        localStorage.getItem('affiliate_token') || 
        localStorage.getItem('company_token') || 
        localStorage.getItem('admin_token') ||
        localStorage.getItem('cashier_token');
        
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        headers.set('x-session-token', token);
      }
      return originalFetch(input, { ...(init || {}), headers });
    }
    return originalFetch(input, init);
  };
}
