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

export default function withAdminAuth({ children }: WithAdminAuthProps) {
  const [, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/me', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.admin);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          navigate('/admin/login');
        }
      } catch (error) {
        console.error('Admin auth check failed:', error);
        setUser(null);
        setIsAuthenticated(false);
        navigate('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
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
