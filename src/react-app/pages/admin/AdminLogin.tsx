import { useState, FormEvent } from 'react';
import { Lock, User, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        await res.json();
        
        // Aguardar um pouco para garantir que o cookie foi definido
        setTimeout(() => {
          window.location.href = '/admin/dashboard';
        }, 500);
      } else {
        let errorData;
        const contentType = res.headers.get('content-type');
        
        try {
          if (contentType && contentType.includes('application/json')) {
            errorData = await res.json();
          } else {
            const errorText = await res.text();
            errorData = { error: errorText || 'Erro de resposta inválida' };
          }
        } catch (parseError) {
          errorData = { error: 'Erro de resposta inválida' };
        }
        
        setErrorMessage(errorData.error || 'Falha no login');
        setSubmitting(false);
      }
    } catch (error) {
      setErrorMessage('Erro de conexão com o servidor');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md px-6">
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700/50 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Login</h1>
            <p className="text-slate-400">Acesse o painel administrativo</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {errorMessage && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Usuário
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="Digite seu usuário"
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="Digite sua senha"
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          
        </div>
      </div>
    </div>
  );
}
