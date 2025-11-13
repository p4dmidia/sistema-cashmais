import React, { useState } from 'react';
import { Link } from 'react-router';
import { withNoAffiliateAuth } from '@/react-app/components/withAuth';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

function Login() {
  const [formData, setFormData] = useState({
    cpf: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  // CPF formatting and validation
  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const validateCPF = (cpf: string) => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    
    // Check for repeated digits
    if (/^(\d)\1{10}$/.test(digits)) return false;
    
    // Validate check digits
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(digits[9])) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(digits[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(digits[10])) return false;
    
    return true;
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setFormData(prev => ({ ...prev, cpf: formatted }));
    
    // Clear CPF error when user starts typing
    if (errors.cpf) {
      setErrors(prev => ({ ...prev, cpf: '' }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, password: e.target.value }));
    
    // Clear password error when user starts typing
    if (errors.password || errors.general) {
      setErrors(prev => ({ ...prev, password: '', general: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate CPF
    if (!validateCPF(formData.cpf)) {
      setErrors({ cpf: 'CPF inválido.' });
      return;
    }
    
    if (!formData.password) {
      setErrors({ password: 'Senha é obrigatória.' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const cpfDigits = formData.cpf.replace(/\D/g, '');
      console.log('Tentando login do afiliado com CPF:', cpfDigits.substring(0, 3) + '***');
      
      const response = await fetch('/api/affiliate/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          cpf: cpfDigits,
          password: formData.password
        }),
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        console.log('Login bem-sucedido, redirecionando para dashboard');
        // Success - redirect to dashboard immediately
        window.location.href = '/dashboard';
      } else {
        // Handle different error types
        if (response.status === 401) {
          setErrors({ general: 'CPF ou senha inválidos.' });
        } else if (response.status === 403) {
          setErrors({ general: 'Conta inativa. Contate o suporte.' });
        } else if (response.status === 422) {
          setErrors({ cpf: 'CPF inválido.' });
        } else {
          setErrors({ general: data.error || 'Erro ao fazer login. Tente novamente.' });
        }
      }
    } catch (error) {
      console.error('Erro durante login:', error);
      setErrors({ general: 'Erro de conexão. Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      window.location.href = '/api/affiliate/oauth/google/start';
    } catch (error) {
      setErrors({ general: 'Erro ao iniciar login com Google.' });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Back to home */}
        <Link
          to="/"
          className="inline-flex items-center text-slate-300 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Voltar ao início
        </Link>

        {/* Login Card */}
        <div className="backdrop-blur-lg bg-white/5 rounded-3xl shadow-2xl p-8 border border-[#001144]/40 relative overflow-hidden">
          {/* Glassmorphism overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl pointer-events-none"></div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-[#70ff00] to-[#50cc00] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-[#001144] font-bold text-2xl">C</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                CashMais
              </h1>
              <p className="text-slate-300 text-sm">
                Acesso do Afiliado
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* CPF Field */}
              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-white mb-2">
                  CPF
                </label>
                <input
                  type="text"
                  id="cpf"
                  value={formData.cpf}
                  onChange={handleCPFChange}
                  maxLength={14}
                  placeholder="000.000.000-00"
                  className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-[#70ff00] ${
                    errors.cpf ? 'border-red-400' : 'border-white/20'
                  }`}
                />
                {errors.cpf && (
                  <p className="mt-1 text-sm text-red-400">{errors.cpf}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={formData.password}
                    onChange={handlePasswordChange}
                    placeholder="Digite sua senha"
                    className={`w-full px-4 py-3 pr-12 bg-white/10 border rounded-xl text-white placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-[#70ff00] ${
                      errors.password || errors.general ? 'border-red-400' : 'border-white/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password}</p>
                )}
              </div>

              {/* General Error Message */}
              {errors.general && (
                <div className="p-3 bg-red-500/10 border border-red-400/30 rounded-lg">
                  <p className="text-sm text-red-400">{errors.general}</p>
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#70ff00] text-[#001144] font-semibold py-3 px-6 rounded-xl hover:scale-[1.02] hover:shadow-lg hover:shadow-[#70ff00]/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-white/20"></div>
              <span className="px-4 text-slate-400 text-sm">ou</span>
              <div className="flex-1 border-t border-white/20"></div>
            </div>

            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-6 py-3 border-2 border-[#70ff00]/50 text-white rounded-xl font-medium hover:border-[#70ff00] hover:bg-[#70ff00]/5 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar com Google
            </button>

            {/* Links */}
            <div className="mt-6 space-y-3 text-center text-sm">
              <div>
                <span className="text-slate-400">Não tem conta? </span>
                <Link
                  to="/cadastro"
                  className="text-[#70ff00] hover:text-[#50cc00] transition-colors font-medium"
                >
                  Cadastre-se
                </Link>
              </div>
              <div>
                <Link
                  to="/afiliado/recuperar-senha"
                  className="text-[#70ff00] hover:text-[#50cc00] transition-colors"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withNoAffiliateAuth(Login);
