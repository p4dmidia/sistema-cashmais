import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { withNoAffiliateAuth } from '@/react-app/components/withAuth';
import { Eye, EyeOff, ArrowLeft, Check, X, CheckCircle } from 'lucide-react';

interface FormData {
  full_name: string;
  cpf: string;
  email: string;
  whatsapp: string;
  password: string;
  confirm_password: string;
  referral_code: string;
  accept_terms: boolean;
}

interface FormErrors {
  [key: string]: string;
}

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    cpf: '',
    email: '',
    whatsapp: '',
    password: '',
    confirm_password: '',
    referral_code: '',
    accept_terms: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Get referral code from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      setFormData(prev => ({ ...prev, referral_code: refCode.toUpperCase() }));
    }
  }, []);

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

  // WhatsApp formatting
  const formatWhatsApp = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  // Password strength validation
  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { strength: 0, text: 'Muito fraca', color: 'bg-red-500' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    if (score <= 2) return { strength: 33, text: 'Fraca', color: 'bg-red-500' };
    if (score === 3) return { strength: 66, text: 'Média', color: 'bg-yellow-500' };
    if (score >= 4) return { strength: 100, text: 'Forte', color: 'bg-[#70ff00]' };
    
    return { strength: 0, text: 'Muito fraca', color: 'bg-red-500' };
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    handleInputChange('cpf', formatted);
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digits = value.replace(/\D/g, '');
    
    if (digits.length <= 11) {
      handleInputChange('whatsapp', formatWhatsApp(digits));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Nome completo é obrigatório.';
    }

    if (!formData.cpf.trim()) {
      newErrors.cpf = 'CPF é obrigatório.';
    } else if (!validateCPF(formData.cpf)) {
      newErrors.cpf = 'CPF inválido.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail inválido.';
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres.';
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Confirmação de senha é obrigatória.';
    } else if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Senhas não coincidem.';
    }

    if (!formData.accept_terms) {
      newErrors.accept_terms = 'Você deve aceitar os termos e política de privacidade.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const cpfDigits = formData.cpf.replace(/\D/g, '');
      const whatsappDigits = formData.whatsapp.replace(/\D/g, '');
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const response = await fetch('/api/affiliate/register', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          cpf: cpfDigits,
          email: formData.email.trim(),
          whatsapp: whatsappDigits || null,
          password: formData.password,
          referral_code: formData.referral_code.trim() || null
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const token = data?.token;
        if (token) {
          try {
            localStorage.setItem('affiliate_token', token);
            if (data?.affiliate) {
              localStorage.setItem('affiliate_user', JSON.stringify(data.affiliate));
            }
          } catch {}
        }
        navigate('/dashboard');
      } else {
        // Handle different error types
        if (response.status === 409) {
          if (data.field === 'cpf') {
            setErrors({ cpf: 'CPF já está cadastrado.' });
          } else if (data.field === 'email') {
            setErrors({ email: 'E-mail já está cadastrado.' });
          } else {
            setErrors({ general: data.error || 'CPF ou e-mail já estão cadastrados.' });
          }
        } else if (response.status === 400) {
          if (data.field_errors) {
            setErrors(data.field_errors);
          } else {
            setErrors({ general: data.error || 'Dados inválidos.' });
          }
        } else {
          setErrors({ general: data.error || 'Erro ao criar conta. Tente novamente.' });
        }
      }
    } catch (error) {
      setErrors({ general: 'Erro de conexão. Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Back to home */}
        <Link
          to="/"
          className="inline-flex items-center text-slate-300 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Voltar ao início
        </Link>

        {/* Register Card */}
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
                Cadastro de Afiliado
              </p>
            </div>

            {/* General Error Message */}
            {errors.general && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-400/30 rounded-lg">
                <p className="text-sm text-red-400">{errors.general}</p>
              </div>
            )}

            {/* Register Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome Completo */}
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-white mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="Seu nome completo"
                  className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-[#70ff00] ${
                    errors.full_name ? 'border-red-400' : 'border-white/20'
                  }`}
                />
                {errors.full_name && (
                  <p className="mt-1 text-sm text-red-400">{errors.full_name}</p>
                )}
              </div>

              {/* CPF */}
              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-white mb-2">
                  CPF *
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

              {/* E-mail */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                  E-mail *
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="seu@email.com"
                  className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-[#70ff00] ${
                    errors.email ? 'border-red-400' : 'border-white/20'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                )}
              </div>

              {/* WhatsApp */}
              <div>
                <label htmlFor="whatsapp" className="block text-sm font-medium text-white mb-2">
                  WhatsApp
                </label>
                <input
                  type="text"
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleWhatsAppChange}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-[#70ff00]"
                />
              </div>

              {/* Senha */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                  Senha *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Digite sua senha"
                    className={`w-full px-4 py-3 pr-12 bg-white/10 border rounded-xl text-white placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-[#70ff00] ${
                      errors.password ? 'border-red-400' : 'border-white/20'
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
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${passwordStrength.strength}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-slate-300">{passwordStrength.text}</span>
                    </div>
                  </div>
                )}
                
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password}</p>
                )}
              </div>

              {/* Confirmar Senha */}
              <div>
                <label htmlFor="confirm_password" className="block text-sm font-medium text-white mb-2">
                  Confirmar Senha *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirm_password"
                    value={formData.confirm_password}
                    onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                    placeholder="Confirme sua senha"
                    className={`w-full px-4 py-3 pr-12 bg-white/10 border rounded-xl text-white placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-[#70ff00] ${
                      errors.confirm_password ? 'border-red-400' : 'border-white/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* Password Match Indicator */}
                {formData.confirm_password && formData.password && (
                  <div className="mt-2 flex items-center space-x-2">
                    {formData.password === formData.confirm_password ? (
                      <>
                        <Check className="w-4 h-4 text-[#70ff00]" />
                        <span className="text-xs text-[#70ff00]">Senhas coincidem</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 text-red-400" />
                        <span className="text-xs text-red-400">Senhas não coincidem</span>
                      </>
                    )}
                  </div>
                )}
                
                {errors.confirm_password && (
                  <p className="mt-1 text-sm text-red-400">{errors.confirm_password}</p>
                )}
              </div>

              {/* Código de Indicação */}
              <div>
                <label htmlFor="referral_code" className="block text-sm font-medium text-white mb-2">
                  Código de Indicação
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="referral_code"
                    value={formData.referral_code}
                    onChange={(e) => handleInputChange('referral_code', e.target.value.toUpperCase())}
                    placeholder="Código opcional"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-[#70ff00]"
                  />
                  {formData.referral_code && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg className="w-5 h-5 text-[#70ff00]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {formData.referral_code 
                    ? `Você será indicado pelo código: ${formData.referral_code}` 
                    : 'Se você foi indicado por alguém, digite o código aqui'
                  }
                </p>
                {formData.referral_code && (
                  <div className="mt-2 p-2 bg-[#70ff00]/10 border border-[#70ff00]/30 rounded-lg">
                    <p className="text-[#70ff00] text-xs">
                      ✅ Código de indicação aplicado! Você e seu indicador ganharão comissões.
                    </p>
                  </div>
                )}
              </div>

              {/* Termos e Condições */}
              <div>
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      id="accept_terms"
                      checked={formData.accept_terms}
                      onChange={(e) => handleInputChange('accept_terms', e.target.checked)}
                      className="w-4 h-4 text-[#70ff00] bg-white/10 border-white/30 rounded focus:ring-[#70ff00] focus:ring-2"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor="accept_terms" className="text-sm text-slate-300">
                      Aceito os{' '}
                      <Link
                        to="/termos"
                        target="_blank"
                        className="text-[#70ff00] hover:text-[#50cc00] underline transition-colors"
                      >
                        Termos de Uso
                      </Link>
                      {' '}e a{' '}
                      <Link
                        to="/politica"
                        target="_blank"
                        className="text-[#70ff00] hover:text-[#50cc00] underline transition-colors"
                      >
                        Política de Privacidade
                      </Link>
                      {' '}*
                    </label>
                    {errors.accept_terms && (
                      <p className="mt-1 text-sm text-red-400">{errors.accept_terms}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Register Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#70ff00] text-[#001144] font-semibold py-3 px-6 rounded-xl hover:scale-[1.02] hover:shadow-lg hover:shadow-[#70ff00]/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="animate-spin w-5 h-5 mr-2 border-2 border-[#001144] border-t-transparent rounded-full"></div>
                ) : (
                  <CheckCircle className="w-5 h-5 mr-2" />
                )}
                {isLoading ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center text-sm">
              <span className="text-slate-400">Já tem conta? </span>
              <Link
                to="/login"
                className="text-[#70ff00] hover:text-[#50cc00] transition-colors font-medium"
              >
                Faça login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withNoAffiliateAuth(Register);
