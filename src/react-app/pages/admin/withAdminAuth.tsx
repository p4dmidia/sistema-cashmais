import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
}

interface WithAdminAuthProps {
  children: React.ReactNode;
}

export default function WithAdminAuth({ children }: WithAdminAuthProps) {
  const [, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 2;
    let mounted = true;
    
    const checkAuth = async () => {
      try {
        console.log(`[WITH_ADMIN_AUTH] Checking admin authentication (attempt ${retryCount + 1}/${maxRetries + 1})...`);
        console.log('[WITH_ADMIN_AUTH] Current cookies:', document.cookie);
        
        const adminToken = localStorage.getItem('admin_token') || '';
        console.log('[WITH_ADMIN_AUTH] Token lido do localStorage:', adminToken);
        const { authenticatedFetch } = await import('@/react-app/lib/authFetch');
        const response = await authenticatedFetch('/api/admin/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        console.log('[WITH_ADMIN_AUTH] Auth check response:', response.status);

        if (!mounted) return; // Component unmounted, stop processing

        if (response.ok) {
          const data = await response.json();
          console.log('[WITH_ADMIN_AUTH] Admin authenticated:', data.admin.username);
          setUser(data.admin);
          setIsAuthenticated(true);
          setIsLoading(false);
        } else if (response.status === 401) {
          console.log('[WITH_ADMIN_AUTH] Auth failed (401), checking retry...');
          
          // Try retry for potential timing issues
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`[WITH_ADMIN_AUTH] Retrying auth check in 500ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
            setTimeout(() => {
              if (mounted) checkAuth();
            }, 500);
            return;
          }
          
          console.log('[WITH_ADMIN_AUTH] Max retries reached, redirecting to login');
          const errorText = await response.text().catch(() => '');
          console.log('[WITH_ADMIN_AUTH] Error details:', errorText);
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          navigate('/admin/login');
        } else {
          console.error('[WITH_ADMIN_AUTH] Unexpected response status:', response.status);
          const errorText = await response.text().catch(() => '');
          console.log('[WITH_ADMIN_AUTH] Error details:', errorText);
          
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(() => {
              if (mounted) checkAuth();
            }, 1000);
            return;
          }
          
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          navigate('/admin/login');
        }
      } catch (error) {
        console.error('[WITH_ADMIN_AUTH] Auth check failed:', error);
        
        if (!mounted) return;
        
        // Network error - try retry
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`[WITH_ADMIN_AUTH] Network error, retrying in 1s (attempt ${retryCount + 1}/${maxRetries + 1})`);
          setTimeout(() => {
            if (mounted) checkAuth();
          }, 1000);
          return;
        }
        
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        navigate('/admin/login');
      }
    };

    checkAuth();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
