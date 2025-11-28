import { LogOut, User, Home, Receipt, Users, DollarSign, Store } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router";
import { type CashMaisUser } from "@/shared/types";

interface LayoutProps {
  children: React.ReactNode;
  user?: CashMaisUser | null;
}

export default function Layout({ children, user }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    // Try affiliate logout first
    try {
      const response = await fetch('/api/affiliate/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        navigate('/');
        return;
      }
    } catch (error) {
      console.error('Affiliate logout error:', error);
    }
    
    // Navigate to home anyway
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011]">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-md border-b border-[#001144]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <img src="/cashmais-logo.png" alt="CashMais" className="h-8 w-auto" />
            </Link>

            <div className="flex items-center space-x-4">
              {!user && (
                <Link
                  to="/empresa/cadastro"
                  className="hidden sm:inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-md border border-[#70ff00] text-[#70ff00] rounded-lg font-semibold hover:bg-[#70ff00] hover:text-white hover:scale-[1.02] transition-all duration-200 text-sm"
                >
                  <Store className="w-4 h-4 mr-2" />
                  Empresa Parceira
                </Link>
              )}
              
              {user && (
                <div className="flex items-center space-x-4">
                <div className="text-sm">
                  <span className="text-gray-300">{user.email}</span>
                  {user.profile && (
                    <span className="ml-2 px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                      {user.profile.role}
                    </span>
                  )}
                </div>
                <nav className="flex items-center space-x-2">
                  <Link
                    to="/dashboard"
                    className={`p-2 rounded-lg transition-all ${
                      location.pathname === '/dashboard'
                        ? 'text-white bg-[#70ff00] scale-[1.02]'
                        : 'text-[#70ff00] hover:text-white hover:bg-[#70ff00]/20'
                    }`}
                    title="Dashboard"
                  >
                    <Home className="w-5 h-5" />
                  </Link>
                  {user?.profile?.role === 'affiliate' && (
                    <>
                      <Link
                        to="/extrato"
                        className={`p-2 rounded-lg transition-all ${
                          location.pathname === '/extrato'
                            ? 'text-white bg-[#70ff00] scale-[1.02]'
                            : 'text-[#70ff00] hover:text-white hover:bg-[#70ff00]/20'
                        }`}
                        title="Extrato"
                      >
                        <Receipt className="w-5 h-5" />
                      </Link>
                      <Link
                        to="/rede"
                        className={`p-2 rounded-lg transition-all ${
                          location.pathname === '/rede'
                            ? 'text-white bg-[#70ff00] scale-[1.02]'
                            : 'text-[#70ff00] hover:text-white hover:bg-[#70ff00]/20'
                        }`}
                        title="Minha Rede"
                        onClick={() => {
                          console.log('[LAYOUT] Clicking on network link, current path:', location.pathname);
                        }}
                      >
                        <Users className="w-5 h-5" />
                      </Link>
                      <Link
                        to="/saque"
                        className={`p-2 rounded-lg transition-all ${
                          location.pathname === '/saque'
                            ? 'text-white bg-[#70ff00] scale-[1.02]'
                            : 'text-[#70ff00] hover:text-white hover:bg-[#70ff00]/20'
                        }`}
                        title="Solicitar Saque"
                      >
                        <DollarSign className="w-5 h-5" />
                      </Link>
                      
                    </>
                  )}
                  <Link
                    to="/perfil"
                    className={`p-2 rounded-lg transition-all ${
                      location.pathname === '/perfil'
                        ? 'text-white bg-[#70ff00] scale-[1.02]'
                        : 'text-[#70ff00] hover:text-white hover:bg-[#70ff00]/20'
                    }`}
                    title="Perfil"
                  >
                    <User className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-[#70ff00] hover:text-white p-2 rounded-lg hover:bg-[#70ff00]/20 transition-all"
                    title="Sair"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
