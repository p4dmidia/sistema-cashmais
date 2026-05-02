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
  Shield,
  Menu,
  X,
  User,
  Tag,
  MessageSquare
} from 'lucide-react';
import UserHeaderMenu from './UserHeaderMenu';
import Layout from './Layout';
import { useAuth } from '@/react-app/hooks/useAuth';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/admin/login");
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const menuItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/withdrawals', icon: CreditCard, label: 'Saques' },
    { path: '/admin/affiliates', icon: Users, label: 'Afiliados' },
    { path: '/admin/companies', icon: Building2, label: 'Empresas' },
    { path: '/admin/categorias', icon: Tag, label: 'Categorias' },
    { path: '/admin/reviews', icon: MessageSquare, label: 'Avaliações' },
    { path: '/admin/reports', icon: BarChart3, label: 'Relatórios' },
    { path: '/admin/settings', icon: Settings, label: 'Configurações' },
  ];

  return (
    <Layout fullWidth={true}>
      <div className="flex flex-col lg:flex-row -mx-4 sm:-mx-6 lg:-mx-8 -my-8 min-h-[calc(100vh-80px)]">
        {/* Sidebar - Desktop Only */}
        <div className="hidden lg:flex w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 flex-col shrink-0">
          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 pt-8">
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
              <div className="text-xs text-gray-400">Gerenciamento Geral</div>
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

        {/* Main content */}
        <div className="flex-1">
          <main className="p-4 sm:p-8">
            {children}
          </main>
        </div>
      </div>
    </Layout>
  );
}
