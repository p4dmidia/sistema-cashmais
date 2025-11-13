import { useState } from "react";
import { Link } from "react-router";

import { User, ArrowLeft, Mail, CheckCircle, AlertCircle } from "lucide-react";

function AffiliatePasswordRecovery() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // CPF formatting
  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleInputChange = (value: string) => {
    // Check if it looks like a CPF (only digits) or email
    if (value.includes('@')) {
      // It's an email, don't format
      setIdentifier(value);
    } else {
      // It might be a CPF, apply formatting
      const formatted = formatCPF(value);
      setIdentifier(formatted);
    }
    
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!identifier.trim()) {
      setError('E-mail ou CPF é obrigatório');
      return;
    }

    // Basic validation
    const isEmail = identifier.includes('@');
    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      setError('E-mail inválido');
      return;
    }

    if (!isEmail) {
      const cpfDigits = identifier.replace(/\D/g, '');
      if (cpfDigits.length !== 11) {
        setError('CPF deve ter 11 dígitos');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      await fetch('/api/affiliate/password/forgot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier }),
      });

      // Always show success message for security (even if identifier doesn't exist)
      setSent(true);
    } catch (error) {
      console.error('Password recovery error:', error);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011] flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <Link
            to="/login"
            className="inline-flex items-center text-slate-300 hover:text-white mb-8 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Voltar ao login
          </Link>

          <div className="backdrop-blur-lg bg-white/5 rounded-3xl shadow-2xl p-8 border border-[#001144]/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl pointer-events-none"></div>
            
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 bg-green-900/30 border-2 border-[#70ff00] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#70ff00]" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">
                Instruções Enviadas!
              </h1>
              <p className="text-slate-300 mb-6">
                Se encontrarmos sua conta, enviaremos as instruções por e-mail.
              </p>
              <p className="text-slate-400 text-sm mb-6">
                Não se esqueça de verificar sua caixa de spam.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center px-6 py-3 bg-[#70ff00] text-[#001144] rounded-xl font-semibold hover:scale-[1.02] transition-all duration-200"
              >
                Voltar ao Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Link
          to="/login"
          className="inline-flex items-center text-slate-300 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Voltar ao login
        </Link>

        <div className="backdrop-blur-lg bg-white/5 rounded-3xl shadow-2xl p-8 border border-[#001144]/40 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-[#70ff00] to-[#50cc00] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <User className="w-8 h-8 text-[#001144]" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Recuperar Senha
              </h1>
              <p className="text-slate-300 text-sm">
                Digite seu e-mail ou CPF para receber as instruções
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  E-mail ou CPF
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-xl text-white placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-[#70ff00] ${
                      error 
                        ? 'border-red-400' 
                        : 'border-white/20'
                    }`}
                    placeholder="seu@email.com ou 000.000.000-00"
                    required
                  />
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Digite seu e-mail ou CPF cadastrado
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#70ff00] text-[#001144] font-semibold py-3 px-6 rounded-xl hover:scale-[1.02] hover:shadow-lg hover:shadow-[#70ff00]/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
              >
                {loading ? (
                  <div className="animate-spin w-5 h-5 mr-2 border-2 border-[#001144] border-t-transparent rounded-full"></div>
                ) : (
                  <Mail className="w-5 h-5 mr-2" />
                )}
                {loading ? 'Enviando...' : 'Enviar Instruções'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-400 border-t border-white/10 pt-6">
              <p>
                Lembrou da senha?{' '}
                <Link to="/login" className="text-[#70ff00] hover:text-[#50cc00] transition-colors font-medium">
                  Fazer login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AffiliatePasswordRecovery;
