import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Building2, CheckCircle, AlertCircle } from 'lucide-react';

export default function CompanyRegister() {
  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    email: '',
    telefone: '',
    responsavel: '',
    senha: '',
    endereco: '',
    site_instagram: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/empresa/registrar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/empresa/login');
        }, 2000);
      } else {
        setError(data.error || 'Erro ao cadastrar empresa');
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#001144] to-[#000011] px-4">
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-[#70ff00]" />
          <h2 className="mt-4 text-2xl font-bold text-white">Empresa cadastrada com sucesso!</h2>
          <p className="mt-2 text-gray-300">Redirecionando para o login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-[#70ff00] rounded-xl flex items-center justify-center">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-white">Cadastrar Empresa</h2>
          <p className="mt-2 text-gray-300">Complete as informações para começar</p>
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Razão Social *
                </label>
                <input
                  name="razao_social"
                  type="text"
                  required
                  value={formData.razao_social}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Nome Fantasia *
                </label>
                <input
                  name="nome_fantasia"
                  type="text"
                  required
                  value={formData.nome_fantasia}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  CNPJ *
                </label>
                <input
                  name="cnpj"
                  type="text"
                  required
                  value={formData.cnpj}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Email *
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Telefone *
                </label>
                <input
                  name="telefone"
                  type="text"
                  required
                  value={formData.telefone}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Responsável *
                </label>
                <input
                  name="responsavel"
                  type="text"
                  required
                  value={formData.responsavel}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Senha *
                </label>
                <input
                  name="senha"
                  type="password"
                  required
                  minLength={6}
                  value={formData.senha}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Endereço (Opcional)
                </label>
                <input
                  name="endereco"
                  type="text"
                  value={formData.endereco}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Site/Instagram (Opcional)
                </label>
                <input
                  name="site_instagram"
                  type="text"
                  value={formData.site_instagram}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-800/50">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/empresa/login')}
                className="flex-1 py-3 px-4 border border-white/20 text-gray-200 rounded-lg hover:bg-white/10 font-medium transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-[#70ff00] to-[#50cc00] hover:from-[#50cc00] hover:to-[#70ff00] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02]"
              >
                {loading ? 'Cadastrando...' : 'Cadastrar Empresa'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
