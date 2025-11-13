import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useCompanyAuth, useAffiliateAuth } from '@/react-app/hooks/useAuth';

// HOC that requires authentication
export function withAuth<T extends object>(WrappedComponent: React.ComponentType<T>) {
  return function AuthenticatedComponent(props: T) {
    const { user, loading } = useCompanyAuth();
    const navigate = useNavigate();

    useEffect(() => {
      console.log('[WITH_AUTH] Auth state - loading:', loading, 'user:', user);
      if (!loading && !user) {
        console.log('[WITH_AUTH] No user found, redirecting to login');
        navigate('/empresa/login');
      }
    }, [user, loading, navigate]);

    if (loading) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-blue-800 border border-green-400 rounded-lg"></div>
          </div>
        </div>
      );
    }

    if (!user) {
      return null; // Will redirect via useEffect
    }

    return <WrappedComponent {...props} />;
  };
}

// HOC that requires specific role
export function withRole(allowedRole: 'company' | 'cashier') {
  return function <T extends object>(WrappedComponent: React.ComponentType<T>) {
    return function RoleGuardedComponent(props: T) {
      const { user, loading } = useCompanyAuth();
      const navigate = useNavigate();

      useEffect(() => {
        if (!loading) {
          console.log('[ROLE_GUARD] Role check - user:', user, 'required role:', allowedRole);
          if (!user) {
            console.log('[ROLE_GUARD] No user found, redirecting to login');
            navigate('/empresa/login');
          } else if (user.role !== allowedRole) {
            // Redirect based on actual role with error messaging
            console.log('[ROLE_GUARD] Role mismatch - user role:', user.role, 'required:', allowedRole);
            if (user.role === 'cashier') {
              console.warn('[ACCESS_DENIED] Cashier attempted to access company area, redirecting to /empresa/caixa');
              navigate('/empresa/caixa');
            } else if (user.role === 'company') {
              console.warn('[ACCESS_DENIED] Company user in wrong area, redirecting to /empresa/dashboard');
              navigate('/empresa/dashboard');
            } else {
              console.warn('[ACCESS_DENIED] Unknown role, redirecting to login');
              navigate('/empresa/login');
            }
          } else {
            console.log('[ROLE_GUARD] Role check passed');
          }
        }
      }, [user, loading, navigate]);

      if (loading) {
        return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="animate-pulse">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-blue-800 border border-green-400 rounded-lg"></div>
            </div>
          </div>
        );
      }

      if (!user || user.role !== allowedRole) {
        return null; // Will redirect via useEffect
      }

      return <WrappedComponent {...props} />;
    };
  };
}

// HOC that combines auth + role checking - LOOP PREVENTION VERSION
export function withCompanyRole<T extends object>(WrappedComponent: React.ComponentType<T>) {
  return function CompanyRoleComponent(props: T) {
    const { user, loading } = useCompanyAuth();
    const navigate = useNavigate();
    const [hasRedirected, setHasRedirected] = React.useState(false);
    const redirectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
      // Prevent multiple redirects and loops
      if (hasRedirected) return;

      console.log('[COMPANY_ROLE] Auth state check:', { 
        loading, 
        user: user ? { role: user.role, companyId: user.companyId } : null,
        hasRedirected,
        pathname: window.location.pathname,
        cookies: document.cookie
      });
      
      // Only process after loading is complete
      if (!loading) {
        if (!user) {
          console.log('[COMPANY_ROLE] No user found, redirecting to login');
          setHasRedirected(true);
          redirectTimeoutRef.current = setTimeout(() => {
            window.location.href = '/empresa/login';
          }, 100);
          return;
        }
        
        if (user.role !== 'company') {
          console.log('[COMPANY_ROLE] User role is not company:', user.role);
          setHasRedirected(true);
          redirectTimeoutRef.current = setTimeout(() => {
            if (user.role === 'cashier') {
              console.log('[COMPANY_ROLE] Cashier accessing company area, redirecting to caixa');
              window.location.href = '/empresa/caixa';
            } else {
              console.log('[COMPANY_ROLE] Unknown role, redirecting to login');
              window.location.href = '/empresa/login';
            }
          }, 100);
          return;
        }

        console.log('[COMPANY_ROLE] Company auth verified, allowing access');
      }
    }, [user, loading, navigate, hasRedirected]);

    useEffect(() => {
      return () => {
        if (redirectTimeoutRef.current) {
          clearTimeout(redirectTimeoutRef.current);
        }
      };
    }, []);

    // Show loading state or redirecting state
    if (loading || hasRedirected) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-blue-800 border border-green-400 rounded-lg"></div>
          </div>
        </div>
      );
    }

    // Don't render anything if user is not valid
    if (!user || user.role !== 'company') {
      return null;
    }

    console.log('[COMPANY_ROLE] Rendering company component');
    return <WrappedComponent {...props} />;
  };
}

export function withCashierRole<T extends object>(WrappedComponent: React.ComponentType<T>) {
  return function CashierRoleComponent(props: T) {
    const { user, loading } = useCompanyAuth();
    const navigate = useNavigate();
    const [hasRedirected, setHasRedirected] = React.useState(false);
    const redirectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
      // Prevent multiple redirects and loops
      if (hasRedirected) return;

      console.log('[CASHIER_ROLE] Auth state check:', { 
        loading, 
        user: user ? { role: user.role, companyId: user.companyId, cashierId: user.cashierId } : null,
        hasRedirected
      });
      
      if (!loading) {
        if (!user) {
          console.log('[CASHIER_ROLE] No user found, redirecting to login');
          setHasRedirected(true);
          redirectTimeoutRef.current = setTimeout(() => {
            window.location.href = '/empresa/login';
          }, 100);
          return;
        } 
        
        if (user.role !== 'cashier') {
          console.log('[CASHIER_ROLE] User role is not cashier:', user.role, 'redirecting based on role');
          setHasRedirected(true);
          redirectTimeoutRef.current = setTimeout(() => {
            if (user.role === 'company') {
              console.log('[CASHIER_ROLE] Company user accessing cashier area, redirecting to dashboard');
              window.location.href = '/empresa/dashboard';
            } else {
              console.log('[CASHIER_ROLE] Unknown role, redirecting to login');
              window.location.href = '/empresa/login';
            }
          }, 100);
          return;
        }

        console.log('[CASHIER_ROLE] Cashier auth verified, allowing access');
      }
    }, [user, loading, navigate, hasRedirected]);

    useEffect(() => {
      return () => {
        if (redirectTimeoutRef.current) {
          clearTimeout(redirectTimeoutRef.current);
        }
      };
    }, []);

    // Show loading state or redirecting state
    if (loading || hasRedirected) {
      console.log('[CASHIER_ROLE] Loading auth state...');
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-900 to-blue-800 border border-green-400 rounded-lg"></div>
          </div>
        </div>
      );
    }

    if (!user || user.role !== 'cashier') {
      console.log('[CASHIER_ROLE] Access denied, user:', user);
      return null; // Will redirect via useEffect
    }

    console.log('[CASHIER_ROLE] Rendering cashier component');
    return <WrappedComponent {...props} />;
  };
}

// HOC that requires affiliate authentication
export function withAffiliateAuth<T extends object>(WrappedComponent: React.ComponentType<T>) {
  return function AffiliateAuthenticatedComponent(props: T) {
    const { user, loading } = useAffiliateAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (!loading && !user) {
        console.log('[AUTH] Redirecting to login - user not found');
        navigate('/login');
      }
    }, [user, loading, navigate]);

    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011] flex items-center justify-center">
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-gradient-to-r from-[#70ff00] to-[#50cc00] rounded-lg"></div>
          </div>
        </div>
      );
    }

    if (!user) {
      console.log('[AUTH] No user, should redirect to login');
      return null; // Will redirect via useEffect
    }

    console.log('[AUTH] User authenticated:', user.email);
    return <WrappedComponent {...props} />;
  };
}

// HOC that redirects if already authenticated as affiliate
export function withNoAffiliateAuth<T extends object>(WrappedComponent: React.ComponentType<T>) {
  return function NoAffiliateAuthComponent(props: T) {
    const { user, loading } = useAffiliateAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (!loading && user) {
        navigate('/dashboard');
      }
    }, [user, loading, navigate]);

    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011] flex items-center justify-center">
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-gradient-to-r from-[#70ff00] to-[#50cc00] rounded-lg"></div>
          </div>
        </div>
      );
    }

    if (user) {
      return null; // Will redirect via useEffect
    }

    return <WrappedComponent {...props} />;
  };
}
