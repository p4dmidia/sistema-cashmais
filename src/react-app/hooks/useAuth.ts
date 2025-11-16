import { useEffect, useState } from 'react';
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

      // Try company auth first if we have company cookie
      if (hasCompanyCookie) {
        try {
          console.log('[COMPANY_AUTH] Attempting company auth...');
          const response = await fetch('/api/empresa/me', {
            credentials: 'include',
          });

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
          }
        } catch (companyError) {
          console.log('[COMPANY_AUTH] Company auth request failed:', companyError);
        }
      }

      // Try cashier auth if we have cashier cookie and company auth failed
      if (hasCashierCookie) {
        try {
          console.log('[COMPANY_AUTH] Attempting cashier auth...');
          const cashierResponse = await fetch('/api/caixa/me', {
            credentials: 'include',
          });

          console.log('[COMPANY_AUTH] Cashier auth response status:', cashierResponse.status);

          if (cashierResponse.ok) {
            const cashierData = await cashierResponse.json();
            console.log('[COMPANY_AUTH] Cashier auth successful, data:', cashierData);
            setUser({
              role: 'cashier',
              companyId: cashierData.company_id,
              userId: cashierData.user_id,
              cashierId: cashierData.id
            });
            setLoading(false);
            setChecking(false);
            return;
          } else if (cashierResponse.status === 401) {
            console.log('[COMPANY_AUTH] Cashier session expired');
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
        await fetch('/api/company/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } else if (user?.role === 'cashier') {
        await fetch('/api/cashier/logout', {
          method: 'POST',
          credentials: 'include',
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
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
      const response = await fetch('/api/affiliate/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[AFFILIATE_AUTH] User authenticated:', data.email);
        setUser(data);
      } else {
        console.log('[AFFILIATE_AUTH] No valid session, status:', response.status);
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
      await fetch('/api/affiliate/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Affiliate logout error:', error);
    } finally {
      setUser(null);
      navigate('/login');
    }
  };

  return { user, loading, logout, checkAuth };
}

// Global response interceptor for 401/403 handling
export function setupAuthInterceptor() {
  // Override fetch to intercept 401 and 403 responses
  const originalFetch = window.fetch;
  
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    
    if (response.status === 401) {
      // Determine which login page to redirect to based on current path
      if (window.location.pathname.includes('/empresa/')) {
        if (!window.location.pathname.includes('/empresa/login')) {
          window.location.href = '/empresa/login';
        }
      } else {
        // For affiliate routes or general routes
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/cadastro')) {
          window.location.href = '/login';
        }
      }
    }
    
    if (response.status === 403) {
      // Handle forbidden access - redirect based on role
      try {
        // Try to get current user role - check company first
        const authResponse = await originalFetch('/api/empresa/me', { credentials: 'include' });
        if (authResponse.ok) {
          // Company user hitting forbidden endpoint - something's wrong, redirect to dashboard
          window.location.href = '/empresa/dashboard';
          return response;
        }
        
        // Try cashier auth
        const cashierResponse = await originalFetch('/api/caixa/me', { credentials: 'include' });
        if (cashierResponse.ok) {
          // Cashier trying to access company area - redirect to cashier page
          window.location.href = '/empresa/caixa';
          return response;
        }
        
        // Try affiliate auth
        const affiliateResponse = await originalFetch('/api/affiliate/me', { credentials: 'include' });
        if (affiliateResponse.ok) {
          // Affiliate user hitting forbidden endpoint - redirect to dashboard
          console.log('[AUTH_INTERCEPTOR] Affiliate 403 - redirecting to dashboard');
          window.location.href = '/dashboard';
          return response;
        }
        
        // No valid session - redirect to appropriate login
        if (window.location.pathname.includes('/empresa/')) {
          window.location.href = '/empresa/login';
        } else {
          window.location.href = '/login';
        }
      } catch {
        // If all fails, redirect to appropriate login
        if (window.location.pathname.includes('/empresa/')) {
          window.location.href = '/empresa/login';
        } else {
          window.location.href = '/login';
        }
      }
    }
    
    return response;
  };
}
