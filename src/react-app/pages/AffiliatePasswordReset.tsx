import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";

import { ArrowLeft, Eye, EyeOff, CheckCircle, AlertCircle, Lock } from "lucide-react";

interface TokenValidation {
  valid: boolean;
  affiliate?: {
    full_name: string;
    email: string;
  };
  error?: string;
}

function AffiliatePasswordReset() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [tokenValidation, setTokenValidation] = useState<TokenValidation | null>(null);
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    validateToken();
  }, [token, navigate]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/affiliate/password/validate-token?token=${encodeURIComponent(token!)}`);
      const data = await response.json();

      if (response.ok) {
        setTokenValidation({ valid: true, affiliate: data.affiliate });
      } else {
        setTokenValidation({ valid: false, error: data.error || 'Token inválido ou expirado' });
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setTokenValidation({ valid: false, error: 'Erro de conexão. Tente novamente.' });
    } finally {
      setValidatingToken(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.newPassword) {
      setError('Nova senha é obrigatória');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (!formData.confirmPassword) {
      setError('Confirmação de senha é obrigatória');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Senhas não coincidem');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/affiliate/password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
        }),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao redefinir senha');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Loading token validation
  if (validatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-gradient-to-br from-[#70ff00] to-[#50cc00] rounded-2xl mx-auto mb-4"></div>
          </div>
          <p className="text-slate-300">Validando token...</p>
        </div>
      </div>
    );
  }

  // Invalid token
  if (!tokenValidation?.valid) {
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
              <div className="w-16 h-16 bg-red-900/30 border-2 border-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">
                Link Inválido
              </h1>
              <p className="text-slate-300 mb-6">
                {tokenValidation?.error || 'Este link de redefinição de senha é inválido ou expirou.'}
              </p>
              <div className="space-y-3">
                <Link
                  to="/afiliado/recuperar-senha"
                  className="block w-full px-6 py-3 bg-[#70ff00] text-[#001144] rounded-xl font-semibold hover:scale-[1.02] transition-all duration-200 text-center"
                >
                  Solicitar Novo Link
                </Link>
                <Link
                  to="/login"
                  className="block w-full px-6 py-3 bg-white/10 text-slate-300 rounded-xl font-semibold hover:bg-white/20 transition-colors text-center"
                >
                  Voltar ao Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011] flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="backdrop-blur-lg bg-white/5 rounded-3xl shadow-2xl p-8 border border-[#001144]/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl pointer-events-none"></div>
            
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 bg-green-900/30 border-2 border-[#70ff00] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#70ff00]" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">
                Senha Alterada!
              </h1>
              <p className="text-slate-300 mb-6">
                Sua senha foi redefinida com sucesso. Agora você pode fazer login com a nova senha.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center px-6 py-3 bg-[#70ff00] text-[#001144] rounded-xl font-semibold hover:scale-[1.02] transition-all duration-200"
              >
                Fazer Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Password reset form
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
                <Lock className="w-8 h-8 text-[#001144]" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Nova Senha
              </h1>
              <p className="text-slate-300 text-sm mb-2">
                {tokenValidation.affiliate?.full_name}
              </p>
              <p className="text-slate-400 text-xs">
                {tokenValidation.affiliate?.email}
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
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    className={`w-full px-4 py-3 pr-12 bg-white/10 border rounded-xl text-white placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-[#70ff00] ${
                      error 
                        ? 'border-red-400' 
                        : 'border-white/20'
                    }`}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`w-full px-4 py-3 pr-12 bg-white/10 border rounded-xl text-white placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-[#70ff00] ${
                      error 
                        ? 'border-red-400' 
                        : 'border-white/20'
                    }`}
                    placeholder="Repita a nova senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#70ff00] text-[#001144] font-semibold py-3 px-6 rounded-xl hover:scale-[1.02] hover:shadow-lg hover:shadow-[#70ff00]/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
              >
                {loading ? (
                  <div className="animate-spin w-5 h-5 mr-2 border-2 border-[#001144] border-t-transparent rounded-full"></div>
                ) : (
                  <CheckCircle className="w-5 h-5 mr-2" />
                )}
                {loading ? 'Salvando...' : 'Salvar Nova Senha'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AffiliatePasswordReset;
