import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Building2, CreditCard, Lock, AlertCircle, Users } from 'lucide-react';

export default function CompanyLogin() {
  const [identifier, setIdentifier] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Detecta tipo de identificador: email empresa, CNPJ empresa ou CPF caixa
  const detectType = (value: string) => {
    const isEmail = value.includes('@');
    const digits = value.replace(/\D/g, '');
    const isCNPJ = digits.length === 14;
    const isCPF = digits.length === 11 && !isEmail;
    const isCompany = isEmail || isCNPJ;
    return { isEmail, isCNPJ, isCPF, isCompany, digits };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { isEmail, isCNPJ, isCPF, isCompany, digits } = detectType(identifier);
      const endpoint = isCompany ? '/api/empresa/login' : '/api/caixa/login';
      
      // Para CNPJ (empresa), enviar no campo 'cnpj' se contém apenas dígitos, senão é email
      let payload;
      if (isCompany) {
        payload = isCNPJ
          ? { cnpj: identifier, senha }
          : { email: identifier, senha };
      } else {
        payload = { cpf: digits, password: senha };
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
      if (anon) headers['Authorization'] = `Bearer ${anon}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (response.ok) {
        if (isCompany) {
          navigate('/empresa/dashboard');
        } else {
          navigate('/empresa/caixa');
        }
        return;
      }

      const statusMessage =
        (data && data.error) ||
        (response.status === 401
          ? (isCompany ? 'Email/CNPJ ou senha inválidos' : 'CPF ou senha inválidos')
          : `Erro ao fazer login (código ${response.status})`);
      setError(statusMessage);
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = () => {
    if (!identifier) return 'CNPJ da empresa, e-mail da empresa ou CPF do caixa';
    const { isEmail, isCNPJ } = detectType(identifier);
    if (isEmail) return 'exemplo@empresa.com';
    if (isCNPJ) return '00.000.000/0001-00';
    return '000.000.000-00';
  };

  const getIcon = () => {
    if (!identifier) return CreditCard;
    const { isCompany } = detectType(identifier);
    return isCompany ? Building2 : Users;
  };

  const Icon = getIcon();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011]">
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-[#70ff00] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">C</span>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-white">Acesso Empresarial</h2>
            <p className="mt-2 text-gray-300">Entre com CNPJ (empresa) ou CPF (caixa)</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-gray-200 mb-2">
                    {!identifier ? 'CNPJ/Email (empresa) ou CPF (caixa)' : detectType(identifier).isCompany ? 'CNPJ ou Email da Empresa' : 'CPF do Caixa'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="identifier"
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                      placeholder={getPlaceholder()}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="senha" className="block text-sm font-medium text-gray-200 mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                  <input
                    id="senha"
                    type="password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete="current-password"
                    className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                    placeholder="Sua senha"
                  />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-800/50">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-[#70ff00] to-[#50cc00] hover:from-[#50cc00] hover:to-[#70ff00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#70ff00] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02]"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-300">
                  Não tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/empresa/cadastro')}
                    className="font-medium text-[#70ff00] hover:text-[#50cc00] transition-colors"
                  >
                    Cadastre sua empresa
                  </button>
                </p>
              </div>

              <div className="text-center pt-4 border-t border-white/10">
                <p className="text-xs text-gray-400">
                  Voltando para afiliados?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="font-medium text-[#70ff00] hover:text-[#50cc00] transition-colors"
                  >
                    Página inicial
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
