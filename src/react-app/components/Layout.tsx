import { LogOut, User, Home, Receipt, Users, DollarSign, Store, Menu, X, LayoutGrid, CreditCard, Shield, FileText, Lock, Settings, TrendingUp, Building2, Eye, LayoutDashboard, BarChart3, Tag, MessageSquare } from "lucide-react";
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { type CashMaisUser } from "@/shared/types";
import { useAuth } from "@/react-app/hooks/useAuth";
import UserHeaderMenu from "@/react-app/components/UserHeaderMenu";

interface LayoutProps {
  children: React.ReactNode;
  user?: CashMaisUser | null;
  fullWidth?: boolean;
}

export default function Layout({ children, user, fullWidth = false }: LayoutProps) {
  const { user: authUser, logout: authLogout } = useAuth();
  const currentUser = user || authUser;
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const role = currentUser?.profile?.role;

  // Definição unificada dos itens de navegação por papel
  // Removendo pills para empresas e admins no desktop conforme solicitado
  const navItems = role === 'affiliate' ? [
    { to: "/dashboard", icon: Home, label: "Painel" },
    { to: "/extrato", icon: Receipt, label: "Extrato" },
    { to: "/rede", icon: Users, label: "Minha Rede" },
    { to: "/saque", icon: DollarSign, label: "Saque" },
    { to: "/perfil", icon: User, label: "Perfil" },
    { to: "/servicos", icon: Store, label: "Serviços" },
  ] : [];

  // Itens específicos do painel da empresa para o menu mobile
  const companyDashboardItems = role === 'company' ? [
    { to: "/empresa/dashboard?tab=overview", icon: TrendingUp, label: "Visão Geral" },
    { to: "/empresa/dashboard?tab=cashiers", icon: Users, label: "Caixas" },
    { to: "/empresa/dashboard?tab=reports", icon: Eye, label: "Relatórios" },
    { to: "/empresa/dashboard?tab=directory", icon: Building2, label: "Perfil Público" },
    { to: "/empresa/dashboard?tab=settings", icon: Settings, label: "Configurações" },
  ] : [];

  // Itens específicos do painel administrativo para o menu mobile
  const adminDashboardItems = role === 'admin' ? [
    { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/withdrawals", icon: CreditCard, label: "Saques" },
    { to: "/admin/affiliates", icon: Users, label: "Afiliados" },
    { to: "/admin/companies", icon: Building2, label: "Empresas" },
    { to: "/admin/categorias", icon: Tag, label: "Categorias" },
    { to: "/admin/reviews", icon: MessageSquare, label: "Avaliações" },
    { to: "/admin/reports", icon: BarChart3, label: "Relatórios" },
    { to: "/admin/settings", icon: Settings, label: "Configurações" },
  ] : [];

  const handleLogout = async () => {
    const isAdmin = currentUser?.profile?.role === 'admin';
    const isCompany = currentUser?.profile?.role === 'company' || currentUser?.profile?.role === 'cashier';
    await authLogout();
    if (isAdmin) {
      navigate("/admin/login");
    } else if (isCompany) {
      navigate("/empresa/login");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011]">
      <header className="bg-white/5 backdrop-blur-md border-b border-[#001144]/40 sticky top-0 z-50">
        <div className={`${fullWidth ? 'w-full px-4 sm:px-6 lg:px-8' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 shrink-0">
              <img src="https://mocha-cdn.com/01995053-6d08-799d-99f1-d9898351a40a/Design-sem-nome.png" alt="CashMais" className="h-10 md:h-16 w-auto transition-transform hover:scale-105" />
            </Link>

            {/* Desktop Navigation (Pills) - Only for Affiliates */}
            {currentUser && navItems.length > 0 && (
              <nav className="hidden md:flex items-center space-x-2 bg-white/5 border border-white/10 p-1.5 rounded-2xl absolute left-1/2 -translate-x-1/2">
                {navItems.map((item) => (
                  <NavLink 
                    key={item.to}
                    to={item.to} 
                    icon={item.icon} 
                    label={item.label} 
                    active={location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))} 
                  />
                ))}
              </nav>
            )}

            <div className="flex items-center space-x-4">
              {!currentUser ? (
                <>
                  <div className="hidden md:flex items-center space-x-2">
                    {/* Grupo Empresa */}
                    <div className="hidden lg:flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
                      <Link to="/empresa/cadastro" className="px-3 py-1.5 text-[#70ff00] text-[10px] font-black uppercase hover:bg-[#70ff00]/10 rounded-lg transition-all tracking-wider">Cadastro Empresa</Link>
                      <div className="w-px h-3 bg-white/10 mx-1"></div>
                      <Link to="/empresa/login" className="px-3 py-1.5 text-white/70 text-[10px] font-black uppercase hover:bg-white/10 rounded-lg transition-all tracking-wider">Login</Link>
                    </div>

                    {/* Grupo Afiliado */}
                    <div className="flex items-center bg-[#70ff00]/5 border border-[#70ff00]/20 rounded-xl p-1">
                      <Link to="/cadastro" className="px-4 py-1.5 bg-[#70ff00] text-[#001144] text-[10px] font-black uppercase rounded-lg hover:bg-[#50cc00] transition-all tracking-wider shadow-lg shadow-[#70ff00]/25">Cadastro Afiliado</Link>
                      <div className="w-px h-3 bg-[#70ff00]/20 mx-1"></div>
                      <Link to="/login" className="px-4 py-1.5 text-[#70ff00] text-[10px] font-black uppercase hover:bg-[#70ff00]/10 rounded-lg transition-all tracking-wider">Entrar</Link>
                    </div>
                  </div>

                  {/* Botão Sanduíche para Mobile (Não logado) */}
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex md:hidden p-2 rounded-lg text-[#70ff00] hover:bg-[#70ff00]/10 transition-colors focus:outline-none"
                  >
                    {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  {/* User Info (Visible on Desktop via UserHeaderMenu, custom on Mobile) */}
                  <div className="hidden md:block">
                    <UserHeaderMenu />
                  </div>

                  {/* Mobile Header Elements */}
                  <div className="flex md:hidden items-center space-x-3">
                    <div className="flex flex-col items-end text-right">
                      <span className="text-white text-[11px] font-bold truncate max-w-[100px]">
                        {currentUser.full_name || (currentUser as any).name || (currentUser.email ? currentUser.email.split('@')[0] : 'Usuário')}
                      </span>
                      <span className="text-[8px] uppercase font-black tracking-widest text-[#70ff00]">
                        {role === 'affiliate' ? 'Afiliado' : role === 'company' ? 'Empresa' : role}
                      </span>
                    </div>
                    <div className="w-9 h-9 rounded-full border-2 border-[#70ff00]/30 overflow-hidden bg-[#70ff00]/10 flex items-center justify-center">
                      {currentUser.avatar_url ? (
                        <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-[#70ff00]" />
                      )}
                    </div>
                    <button
                      onClick={toggleMenu}
                      className="p-2 rounded-lg text-[#70ff00] hover:bg-[#70ff00]/10 transition-colors focus:outline-none"
                    >
                      {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu (ALL links combined) */}
        {isMenuOpen && (
          <div className="md:hidden bg-[#001144]/fa divide-y divide-white/5 backdrop-blur-xl border-t border-white/10 animate-in slide-in-from-top-4 duration-200">
            {currentUser ? (
              <nav className="py-2 px-4 space-y-1">
                {/* Navigation Section */}
                {role === 'affiliate' && navItems.map((item) => (
                  <MobileNavLink 
                    key={item.to}
                    to={item.to} 
                    icon={item.icon} 
                    label={item.label} 
                    active={location.pathname === item.to} 
                    onClick={closeMenu} 
                  />
                ))}

                {/* Company Dashboard Items (Contextual) */}
                {role === 'company' && companyDashboardItems.map((item) => (
                  <MobileNavLink 
                    key={item.to}
                    to={item.to} 
                    icon={item.icon} 
                    label={item.label} 
                    active={location.pathname + location.search === item.to} 
                    onClick={closeMenu} 
                  />
                ))}

                {/* Admin Dashboard Items (Contextual) */}
                {role === 'admin' && adminDashboardItems.map((item) => (
                  <MobileNavLink 
                    key={item.to}
                    to={item.to} 
                    icon={item.icon} 
                    label={item.label} 
                    active={location.pathname === item.to} 
                    onClick={closeMenu} 
                  />
                ))}

                <div className="h-px bg-white/5 my-2"></div>
                
                {/* Account Section */}
                <MobileNavLink to="/perfil?tab=password" icon={Lock} label="Alterar Senha" active={false} onClick={closeMenu} />
                <MobileNavLink to="/termos" icon={FileText} label="Termos de Uso" active={location.pathname === '/termos'} onClick={closeMenu} />
                <MobileNavLink to="/privacidade" icon={Shield} label="Políticas de Privacidade" active={location.pathname === '/privacidade'} onClick={closeMenu} />
                
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
            ) : (
              /* Menu para não logados no Layout global */
              <nav className="py-4 px-4 space-y-4">
                <div className="space-y-2">
                  <p className="px-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Área do Afiliado</p>
                  <Link to="/login" className="flex items-center space-x-4 px-4 py-3 text-white hover:bg-white/5 rounded-xl transition-all" onClick={closeMenu}>
                    <User className="w-5 h-5 text-[#70ff00]" />
                    <span className="font-bold">Login Afiliado</span>
                  </Link>
                  <Link to="/cadastro" className="flex items-center space-x-4 px-4 py-3 bg-[#70ff00]/10 text-[#70ff00] border border-[#70ff00]/20 rounded-xl transition-all" onClick={closeMenu}>
                    <Users className="w-5 h-5" />
                    <span className="font-bold">Cadastro Afiliado</span>
                  </Link>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <p className="px-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Área da Empresa</p>
                  <Link to="/empresa/login" className="flex items-center space-x-4 px-4 py-3 text-white hover:bg-white/5 rounded-xl transition-all" onClick={closeMenu}>
                    <Lock className="w-5 h-5 text-white/70" />
                    <span className="font-bold">Login Empresa</span>
                  </Link>
                  <Link to="/empresa/cadastro" className="flex items-center space-x-4 px-4 py-3 text-[#70ff00] hover:bg-[#70ff00]/10 rounded-xl transition-all" onClick={closeMenu}>
                    <Building2 className="w-5 h-5" />
                    <span className="font-bold">Cadastro Empresa</span>
                  </Link>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <Link to="/servicos" className="flex items-center space-x-4 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-xl transition-all" onClick={closeMenu}>
                    <Store className="w-5 h-5" />
                    <span className="font-bold">Diretório de Serviços</span>
                  </Link>
                </div>
              </nav>
            )}
          </div>
        )}
      </header>

      <main className={`${fullWidth ? 'w-full px-4 sm:px-6 lg:px-8' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'} py-8`}>
        {children}
      </main>

      <footer className="bg-white/5 backdrop-blur-md border-t border-white/10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex flex-col items-center md:items-start space-y-4 mb-8 md:mb-0">
              <Link to="/">
                <img 
                  src="https://mocha-cdn.com/01995053-6d08-799d-99f1-d9898351a40a/Design-sem-nome.png" 
                  alt="CashMais" 
                  className="h-24 w-auto"
                />
              </Link>
            </div>
            
            <div className="text-gray-400 text-sm text-center md:text-right">
              <p>&copy; 2024 CashMais. Sistema de cashback com MMN</p>
              <p className="mt-1">CNPJ: 61356738000180</p>
              <p className="mt-1">CashMais Tecnologia em Consumo e Cashback Ltda</p>
              <p className="mt-1">Desenvolvido por <a href="https://www.p4dmidia.com.br/" target="_blank" rel="noopener noreferrer" className="text-[#70ff00] hover:underline">P4D Mídia</a></p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


function NavLink({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 font-bold text-xs uppercase tracking-wider ${
        active
          ? 'text-[#001144] bg-[#70ff00] shadow-[0_0_20px_rgba(112,255,0,0.4)]'
          : 'text-[#70ff00] hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
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
