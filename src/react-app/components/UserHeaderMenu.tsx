import React, { useState } from "react";
import { User, LogOut, Home, Store, LayoutGrid, Lock, FileText, LayoutDashboard, CreditCard, Users, Building2, BarChart3, Settings, Tag, MessageSquare, Video } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/react-app/hooks/useAuth";

export default function UserHeaderMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const role = user.profile?.role;

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'affiliate': return 'Afiliado';
      case 'admin': return 'Admin';
      case 'company': return 'Empresa';
      case 'cashier': return 'Caixa';
      default: return role;
    }
  };

  const getDashboardPath = () => {
    switch (role) {
      case 'admin': return '/admin/dashboard';
      case 'company': return '/empresa/dashboard';
      case 'cashier': return '/caixa/compras';
      default: return '/dashboard';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/5 transition-all outline-none group"
      >
        <div className="hidden md:flex flex-col items-end text-right">
          <span className="text-white text-sm font-bold truncate max-w-[150px]">
            {user.full_name || (user as any).name || (user.email ? user.email.split('@')[0] : 'Usuário')}
          </span>
          <span className="text-[10px] uppercase font-black tracking-widest text-[#70ff00]">
            {getRoleLabel(role || '')}
          </span>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-[#70ff00]/30 overflow-hidden bg-[#70ff00]/10 flex items-center justify-center group-hover:border-[#70ff00] transition-all">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-[#70ff00]" />
          )}
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-64 bg-[#001144]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20 py-2 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
            {role === 'admin' ? (
              <>
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#70ff00]" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/admin/withdrawals"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <CreditCard className="w-4 h-4 text-[#70ff00]" />
                  <span>Saques</span>
                </Link>
                <Link
                  to="/admin/affiliates"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <Users className="w-4 h-4 text-[#70ff00]" />
                  <span>Afiliados</span>
                </Link>
                <Link
                  to="/admin/companies"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <Building2 className="w-4 h-4 text-[#70ff00]" />
                  <span>Empresas</span>
                </Link>
                <Link
                  to="/admin/categorias"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <Tag className="w-4 h-4 text-[#70ff00]" />
                  <span>Categorias</span>
                </Link>
                <Link
                  to="/admin/reviews"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-[#70ff00]" />
                  <span>Avaliações</span>
                </Link>
                <Link
                  to="/admin/reports"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <BarChart3 className="w-4 h-4 text-[#70ff00]" />
                  <span>Relatórios</span>
                </Link>
                <Link
                  to="/admin/settings"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <Settings className="w-4 h-4 text-[#70ff00]" />
                  <span>Configurações</span>
                </Link>
              </>
            ) : role === 'cashier' ? (
              <Link
                to="/caixa/compras"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
              >
                <LayoutGrid className="w-4 h-4 text-[#70ff00]" />
                <span>Registrar cashback</span>
              </Link>
            ) : (
              <Link
                to={getDashboardPath()}
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
              >
                <Home className="w-4 h-4 text-[#70ff00]" />
                <span>Painel principal</span>
              </Link>
            )}

            <Link
              to="/servicos"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
            >
              <Store className="w-4 h-4 text-[#70ff00]" />
              <span>Empresas parceiras</span>
            </Link>

            <Link
              to="/tutoriais"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
            >
              <Video className="w-4 h-4 text-[#70ff00]" />
              <span>Vídeos Tutoriais</span>
            </Link>

            <div className="h-px bg-white/5 my-2"></div>

            <Link
              to="/perfil?tab=password"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-white/70 hover:bg-white/5 transition-colors"
            >
              <Lock className="w-4 h-4" />
              <span>Alterar Senha</span>
            </Link>

            <Link
              to="/termos"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-white/70 hover:bg-white/5 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Termos de Uso</span>
            </Link>

            <button
              onClick={() => { setIsOpen(false); logout(); }}
              className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
