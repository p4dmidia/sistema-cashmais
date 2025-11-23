import { useState, useCallback, useEffect } from 'react';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
}

interface AdminAuthState {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const checkAuth = useCallback(async () => {
    // Prevent multiple simultaneous checks
    setState(prev => {
      if (prev.isLoading) {
        console.log('[ADMIN_AUTH] Already checking auth, skipping...');
        return prev;
      }
      return { ...prev, isLoading: true };
    });
    
    try {
      console.log('[ADMIN_AUTH] Checking authentication...');
      console.log('[ADMIN_AUTH] Current cookies:', document.cookie);
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
      if (anon) headers['Authorization'] = `Bearer ${anon}`;
      const response = await fetch('/api/admin/me', {
        credentials: 'include',
        headers,
      });

      console.log('[ADMIN_AUTH] Auth response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[ADMIN_AUTH] Auth successful, user:', data.admin);
        setState({
          user: data.admin,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        console.log('[ADMIN_AUTH] Auth failed, status:', response.status);
        const errorText = await response.text();
        console.log('[ADMIN_AUTH] Error response:', errorText);
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('[ADMIN_AUTH] Auth check network error:', error);
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const headers2: Record<string, string> = { 'Content-Type': 'application/json' };
      const anon2 = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
      if (anon2) headers2['Authorization'] = `Bearer ${anon2}`;
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: headers2,
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Login API response successful:', data);
        // Immediately update state with authenticated user
        setState({
          user: data.admin,
          isLoading: false,
          isAuthenticated: true,
        });
        
        // Wait a bit longer for cookie to be set, then verify
        setTimeout(() => {
          checkAuth();
        }, 200);
        
        return { success: true, admin: data.admin };
      } else {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
        return { success: false, error: data.error };
      }
    } catch (error) {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  // Check authentication on mount - only once
  useEffect(() => {
    let mounted = true;
    
    const runCheck = async () => {
      if (mounted) {
        await checkAuth();
      }
    };
    
    // Only run if we haven't checked yet (initial state has isLoading: true)
    if (state.isLoading && !state.user) {
      runCheck();
    }
    
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array to run only once

  return {
    ...state,
    login,
    logout,
    checkAuth,
  };
}
