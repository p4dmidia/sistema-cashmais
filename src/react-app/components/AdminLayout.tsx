import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  Building2, 
  BarChart3, 
  Settings, 
  LogOut,
  Shield
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      navigate('/admin/login');
    }
  };

  const menuItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/withdrawals', icon: CreditCard, label: 'Saques' },
    { path: '/admin/affiliates', icon: Users, label: 'Afiliados' },
    { path: '/admin/companies', icon: Building2, label: 'Empresas' },
    { path: '/admin/reports', icon: BarChart3, label: 'Relatórios' },
    { path: '/admin/settings', icon: Settings, label: 'Configurações' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011]">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-black/20 backdrop-blur-xl border-r border-white/10">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-green-400" />
              <span className="text-xl font-bold text-white">Admin</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-green-400' : 'text-gray-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="border-t border-white/10 p-4">
            <div className="mb-3 text-sm text-gray-300">
              <div className="font-medium text-white">Administrador</div>
              <div className="text-xs text-gray-400">admin@cashmais.com</div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 disabled:opacity-50"
            >
              <LogOut className="mr-3 h-5 w-5" />
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
