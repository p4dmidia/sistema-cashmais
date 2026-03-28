import { useEffect, useState } from 'react';
import { authenticatedFetch } from '@/react-app/lib/authFetch';
import { useNavigate } from 'react-router';

export interface CompanyAuthUser {
  role: 'company' | 'cashier';
  companyId: number;
  userId?: number;
  cashierId?: number;
}

export interface AffiliateAuthUser {
  id: number;
  full_name: string;
  cpf: string;
  email: string;
  whatsapp?: string;
  referral_code: string;
  customer_coupon: string;
  sponsor_id?: number;
  is_verified: boolean;
  created_at: string;
}

export function useCompanyAuth() {
  const [user, setUser] = useState<CompanyAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!checking && loading) {
      checkAuth();
    }
  }, [checking, loading]);

  const checkAuth = async () => {
    // Prevent multiple simultaneous auth checks
    if (checking) {
      console.log('[COMPANY_AUTH] Already checking auth, skipping...');
      return;
    }

    setChecking(true);
    
    try {
      console.log('[COMPANY_AUTH] Starting auth check...');
      console.log('[COMPANY_AUTH] Current cookies:', document.cookie);
      
      // Check cookies to determine which auth to try first
      const hasCompanyCookie = document.cookie.includes('company_session');
      const hasCashierCookie = document.cookie.includes('cashier_session');
      
      console.log('[COMPANY_AUTH] Cookies detected:', { hasCompanyCookie, hasCashierCookie });

      // Try company auth first if we have company cookie or local token
      const companyToken = localStorage.getItem('company_token');
      if (companyToken || hasCompanyCookie) {
        try {
          console.log('[COMPANY_AUTH] Attempting company auth...');
          const response = await authenticatedFetch('/api/empresa/me');

          console.log('[COMPANY_AUTH] Company auth response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('[COMPANY_AUTH] Company auth successful, data:', data);
            setUser({
              role: 'company',
              companyId: data.id
            });
            setLoading(false);
            setChecking(false);
            return;
          } else if (response.status === 401) {
            console.log('[COMPANY_AUTH] Company session expired');
            if (companyToken) localStorage.removeItem('company_token');
          }
        } catch (companyError) {
          console.log('[COMPANY_AUTH] Company auth request failed:', companyError);
        }
      }

      // Try cashier auth if we have cashier cookie/token and company auth failed
      const cashierToken = localStorage.getItem('cashier_token');
      if (cashierToken || hasCashierCookie) {
        try {
          console.log('[COMPANY_AUTH] Attempting cashier auth...');
          const response = await authenticatedFetch('/api/caixa/me');

          console.log('[COMPANY_AUTH] Cashier auth response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('[COMPANY_AUTH] Cashier auth successful, data:', data);
            setUser({
              role: 'cashier',
              companyId: data.company_id,
              userId: data.user_id,
              cashierId: data.id
            });
            setLoading(false);
            setChecking(false);
            return;
          } else if (response.status === 401) {
            console.log('[COMPANY_AUTH] Cashier session expired');
            if (cashierToken) localStorage.removeItem('cashier_token');
          }
        } catch (cashierError) {
          console.log('[COMPANY_AUTH] Cashier auth request failed:', cashierError);
        }
      }

      console.log('[COMPANY_AUTH] No valid auth found, setting user to null');
      setUser(null);
    } catch (error) {
      console.error('[COMPANY_AUTH] Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  const logout = async () => {
    try {
      if (user?.role === 'company') {
        await authenticatedFetch('/api/empresa/logout', {
          method: 'POST'
        });
      } else if (user?.role === 'cashier') {
        await authenticatedFetch('/api/caixa/logout', {
          method: 'POST'
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('company_token');
      localStorage.removeItem('cashier_token');
      setUser(null);
      navigate('/empresa/login');
    }
  };

  return { user, loading, logout, checkAuth };
}

export function useAffiliateAuth() {
  const [user, setUser] = useState<AffiliateAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('[AFFILIATE_AUTH] Checking authentication...');
      const token = localStorage.getItem('affiliate_token');
      if (!token) {
        console.log('[AFFILIATE_AUTH] No token in localStorage, setting unauthenticated');
        setUser(null);
        setLoading(false);
        return;
      }
      const response = await authenticatedFetch('/api/affiliate/me');
      if (response.ok) {
        const data = await response.json();
        console.log('[AFFILIATE_AUTH] User authenticated:', data.email);
        setUser(data);
      } else {
        console.log('[AFFILIATE_AUTH] No valid session, status:', response.status);
        try {
          const cached = localStorage.getItem('affiliate_user');
          if (cached) {
            const parsed = JSON.parse(cached);
            setUser(parsed);
            return;
          }
        } catch {}
        setUser(null);
      }
    } catch (error) {
      console.error('[AFFILIATE_AUTH] Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const { authenticatedFetch } = await import('@/react-app/lib/authFetch');
      await authenticatedFetch('/api/affiliate/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Affiliate logout error:', error);
    } finally {
      try {
        localStorage.removeItem('affiliate_token');
        localStorage.removeItem('affiliate_user');
      } catch {}
      setUser(null);
      navigate('/login');
    }
  };

  return { user, loading, logout, checkAuth };
}

// Global response interceptor for 401/403 handling
export function setupAuthInterceptor() {
  const originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url);
    
    // Only intercept /api calls
    if (url.includes('/api/')) {
      const headers = new Headers(init?.headers || {});
      
      const affToken = localStorage.getItem('affiliate_token');
      const adminToken = localStorage.getItem('admin_token');
      const companyToken = localStorage.getItem('company_token');
      const cashierToken = localStorage.getItem('cashier_token');
      
      let token = affToken;
      if (url.includes('/api/admin')) token = adminToken;
      else if (url.includes('/api/empresa')) token = companyToken;
      else if (url.includes('/api/caixa')) token = cashierToken;
      
      if (!token) token = affToken || adminToken || companyToken || cashierToken;

      if (token && !headers.has('x-session-token')) {
        headers.set('x-session-token', token);
        headers.set('Authorization', `Bearer ${token}`);
      }
      
      return originalFetch(input, { ...(init || {}), headers });
    }

    return originalFetch(input, init);
  };
}
