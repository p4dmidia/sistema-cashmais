import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Get the authorization code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (!code) {
          throw new Error('No authorization code found');
        }

        // Exchange code for session token via our backend
        const response = await fetch('/api/affiliate/oauth/google/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Authentication failed');
        }

        await response.json();
        
        setStatus('success');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Falha na autenticação. Tente novamente.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">C</span>
            </div>
            
            {status === 'loading' && (
              <>
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
                <h1 className="text-xl font-semibold text-white mb-2">
                  Processando autenticação...
                </h1>
                <p className="text-gray-400">
                  Aguarde enquanto configuramos sua conta
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-4" />
                <h1 className="text-xl font-semibold text-white mb-2">
                  Autenticação realizada com sucesso!
                </h1>
                <p className="text-gray-400">
                  Redirecionando para o dashboard...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-semibold text-white mb-2">
                  Erro na autenticação
                </h1>
                <p className="text-gray-400 mb-4">
                  {error}
                </p>
                <p className="text-sm text-gray-500">
                  Redirecionando para a página de login...
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
