import { BrowserRouter as Router, Routes, Route } from 'react-router';
import { Suspense, lazy } from 'react';
import Home from '@/react-app/pages/Home';
import Login from '@/react-app/pages/Login';
import Register from '@/react-app/pages/Register';
import AuthCallback from '@/react-app/pages/AuthCallback';
import Dashboard from '@/react-app/pages/Dashboard';
import Profile from '@/react-app/pages/Profile';
import Extract from '@/react-app/pages/Extract';
import Network from '@/react-app/pages/Network';
const TestSupabase = lazy(() => import('@/react-app/pages/TestSupabase'));

const TestSupabaseComplete = lazy(() => import('@/react-app/pages/TestSupabaseComplete'));

import Withdrawal from '@/react-app/pages/Withdrawal';
import AffiliatePasswordRecovery from '@/react-app/pages/AffiliatePasswordRecovery';
import AffiliatePasswordReset from '@/react-app/pages/AffiliatePasswordReset';
import CompanyLogin from '@/react-app/pages/CompanyLogin';
import CompanyRegister from '@/react-app/pages/CompanyRegister';
import CompanyDashboard from '@/react-app/pages/CompanyDashboard';
import CashierLogin from '@/react-app/pages/CashierLogin';
import CashierPage from '@/react-app/pages/CashierPage';

// Admin components
import AdminLogin from '@/react-app/pages/admin/AdminLogin';
import AdminDashboard from '@/react-app/pages/admin/AdminDashboard';
import WithdrawalsManagement from '@/react-app/pages/admin/WithdrawalsManagement';
import AffiliatesManagement from '@/react-app/pages/admin/AffiliatesManagement';
import CompaniesManagement from '@/react-app/pages/admin/CompaniesManagement';
import SystemSettings from '@/react-app/pages/admin/SystemSettings';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011]">
        <Routes>
          {/* Home routes */}
          <Route path="/" element={<Home />} />
          
          {/* Test routes */}
          <Route path="/test-supabase" element={<Suspense fallback={null}><TestSupabase /></Suspense>} />

          <Route path="/test-supabase-complete" element={<Suspense fallback={null}><TestSupabaseComplete /></Suspense>} />
          
          {/* Affiliate authentication routes (no redirect protection) */}
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/afiliado/recuperar-senha" element={<AffiliatePasswordRecovery />} />
          <Route path="/afiliado/resetar-senha" element={<AffiliatePasswordReset />} />
          
          {/* Protected affiliate routes */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/extrato" element={<Extract />} />
          <Route path="/rede" element={<Network />} />
          
          <Route path="/saque" element={<Withdrawal />} />
          
          {/* Company routes */}
          <Route path="/empresa/login" element={<CompanyLogin />} />
          <Route path="/empresa/cadastro" element={<CompanyRegister />} />
          <Route path="/empresa/dashboard" element={<CompanyDashboard />} />
          
          {/* Cashier routes */}
          <Route path="/caixa/login" element={<CashierLogin />} />
          <Route path="/caixa/compras" element={<CashierPage />} />
          <Route path="/empresa/caixa" element={<CashierPage />} />
          
          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/withdrawals" element={<WithdrawalsManagement />} />
          <Route path="/admin/affiliates" element={<AffiliatesManagement />} />
          <Route path="/admin/companies" element={<CompaniesManagement />} />
          <Route path="/admin/settings" element={<SystemSettings />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
