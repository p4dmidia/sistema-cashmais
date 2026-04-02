import { LogOut, User, Home, Receipt, Users, DollarSign, Store, Menu, X } from "lucide-react";
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { type CashMaisUser } from "@/shared/types";

interface LayoutProps {
  children: React.ReactNode;
  user?: CashMaisUser | null;
}

export default function Layout({ children, user }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = async () => {
    try {
      const { authenticatedFetch } = await import('@/react-app/lib/authFetch');
      await authenticatedFetch('/api/affiliate/logout', { method: 'POST' });
    } catch (error) {
      console.error('Affiliate logout error:', error);
    } finally {
      try {
        localStorage.removeItem('affiliate_token');
        localStorage.removeItem('affiliate_user');
      } catch {}
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011]">
      <header className="bg-white/5 backdrop-blur-md border-b border-[#001144]/40 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-2 shrink-0">
              <img src="https://mocha-cdn.com/01995053-6d08-799d-99f1-d9898351a40a/Design-sem-nome.png" alt="CashMais" className="h-8 w-auto" />
            </Link>

            {/* Navigation / Icons */}
            <div className="flex items-center">
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-6">
                {!user && (
                  <Link
                    to="/empresa/cadastro"
                    className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-md border border-[#70ff00] text-[#70ff00] rounded-lg font-semibold hover:bg-[#70ff00] hover:text-white transition-all text-sm"
                  >
                    <Store className="w-4 h-4 mr-2" />
                    Empresa Parceira
                  </Link>
                )}
                
                {user && (
                  <div className="flex items-center space-x-6">
                    <div className="hidden lg:flex flex-col items-end text-sm leading-tight">
                      <span className="text-gray-200 font-medium truncate max-w-[150px]">{user.email}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#70ff00] opacity-80">
                        {user.profile?.role === 'affiliate' ? 'Afiliado' : user.profile?.role}
                      </span>
                    </div>
                    <nav className="flex items-center space-x-1 border-l border-white/10 pl-6">
                      <NavLink to="/dashboard" icon={Home} label="Dashboard" active={location.pathname === '/dashboard'} />
                      {user?.profile?.role === 'affiliate' && (
                        <>
                          <NavLink to="/extrato" icon={Receipt} label="Extrato" active={location.pathname === '/extrato'} />
                          <NavLink to="/rede" icon={Users} label="Minha Rede" active={location.pathname === '/rede'} />
                          <NavLink to="/saque" icon={DollarSign} label="Saque" active={location.pathname === '/saque'} />
                        </>
                      )}
                      <NavLink to="/perfil" icon={User} label="Perfil" active={location.pathname === '/perfil'} />
                      <button
                        onClick={handleLogout}
                        className="text-red-400 hover:text-white p-2.5 rounded-lg hover:bg-red-500/20 transition-all ml-1"
                        title="Sair"
                      >
                        <LogOut className="w-5 h-5" />
                      </button>
                    </nav>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <div className="flex md:hidden">
                <button
                  onClick={toggleMenu}
                  className="p-2 rounded-lg text-[#70ff00] hover:bg-[#70ff00]/10 transition-colors focus:outline-none"
                  aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
                >
                  {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMenuOpen && user && (
          <div className="md:hidden bg-[#001144]/fa divide-y divide-white/5 backdrop-blur-xl border-t border-white/10 animate-in slide-in-from-top-4 duration-200">
            <div className="py-4 px-6 flex items-center space-x-3">
              <div className="bg-[#70ff00]/20 p-2 rounded-full">
                 <User className="w-6 h-6 text-[#70ff00]" />
              </div>
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium truncate max-w-[200px]">{user.email}</span>
                <span className="text-[#70ff00] text-[10px] uppercase font-black tracking-widest">
                  {user.profile?.role === 'affiliate' ? 'Afiliado' : user.profile?.role}
                </span>
              </div>
            </div>
            
            <nav className="py-2 px-4 space-y-1">
              <MobileNavLink to="/dashboard" icon={Home} label="Dashboard" active={location.pathname === '/dashboard'} onClick={closeMenu} />
              {user?.profile?.role === 'affiliate' && (
                <>
                  <MobileNavLink to="/extrato" icon={Receipt} label="Extrato" active={location.pathname === '/extrato'} onClick={closeMenu} />
                  <MobileNavLink to="/rede" icon={Users} label="Minha Rede" active={location.pathname === '/rede'} onClick={closeMenu} />
                  <MobileNavLink to="/saque" icon={DollarSign} label="Solicitar Saque" active={location.pathname === '/saque'} onClick={closeMenu} />
                </>
              )}
              <MobileNavLink to="/perfil" icon={User} label="Perfil" active={location.pathname === '/perfil'} onClick={closeMenu} />
              
              <button
                onClick={() => {
                  closeMenu();
                  handleLogout();
                }}
                className="w-full flex items-center space-x-4 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-medium"
              >
                <LogOut className="w-5 h-5" />
                <span>Encerrar Sessão</span>
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

function NavLink({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active: boolean }) {
  return (
    <Link
      to={to}
      className={`p-2.5 rounded-lg transition-all ${
        active
          ? 'text-white bg-[#70ff00] shadow-[0_0_15px_rgba(112,255,0,0.3)]'
          : 'text-[#70ff00] hover:text-white hover:bg-[#70ff00]/20'
      }`}
      title={label}
    >
      <Icon className="w-5 h-5" />
    </Link>
  );
}

function MobileNavLink({ to, icon: Icon, label, active, onClick }: { to: string, icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all font-medium ${
        active 
          ? 'bg-[#70ff00] text-white shadow-[0_0_15px_rgba(112,255,0,0.3)]' 
          : 'text-gray-300 hover:bg-white/5 hover:text-[#70ff00]'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </Link>
  );
}
