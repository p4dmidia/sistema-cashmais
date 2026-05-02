import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Building2, CheckCircle, AlertCircle, Camera, MessageSquare, Info } from 'lucide-react';
import { supabase } from '@/react-app/lib/supabase';

export default function CompanyRegister() {
  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    email: '',
    telefone: '',
    responsavel: '',
    senha: '',
    address_zip: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_district: '',
    address_city: '',
    address_state: '',
    site_instagram: '',
    description: '',
    whatsapp: '',
    thumbnail_url: '',
    category_id: '',
    latitude: null as number | null,
    longitude: null as number | null
  });

  // Geocoding effect
  useEffect(() => {
    const geocodeAddress = async () => {
      if (formData.address_street && formData.address_number && formData.address_city) {
        try {
          const address = `${formData.address_street}, ${formData.address_number}, ${formData.address_city}, ${formData.address_state}, Brazil`;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
          );
          const data = await response.json();
          if (data && data.length > 0) {
            console.log('Geocoding success:', data[0].lat, data[0].lon);
            setFormData(prev => ({
              ...prev,
              latitude: parseFloat(data[0].lat),
              longitude: parseFloat(data[0].lon)
            }));
          }
        } catch (err) {
          console.error('Geocoding failed:', err);
        }
      }
    };

    const timer = setTimeout(geocodeAddress, 1000); // Debounce
    return () => clearTimeout(timer);
  }, [formData.address_street, formData.address_number, formData.address_city, formData.address_state]);

  const [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Tenta fazer upload para o bucket 'public'
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading to public bucket:', uploadError);
        throw new Error('Falha ao enviar imagem. Verifique se o bucket "public" existe e tem permissão.');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, thumbnail_url: publicUrl }));
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(err.message || 'Erro ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, address_zip: value }));
    
    const cep = value.replace(/\D/g, '');
    if (cep.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            address_street: data.logradouro,
            address_district: data.bairro,
            address_city: data.localidade,
            address_state: data.uf
          }));
        }
      } catch (err) {
        console.error('Failed to fetch CEP:', err);
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 border-t border-white/10 pt-6 mt-2">
                <h3 className="text-lg font-medium text-white mb-4">Endereço da Empresa</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  CEP *
                </label>
                <div className="relative">
                  <input
                    name="address_zip"
                    type="text"
                    required
                    maxLength={9}
                    value={formData.address_zip}
                    onChange={handleCepChange}
                    placeholder="00000-000"
                    className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                  />
                  {cepLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Estado (UF) *
                </label>
                <input
                  name="address_state"
                  type="text"
                  required
                  maxLength={2}
                  value={formData.address_state}
                  onChange={handleChange}
                  placeholder="SP"
                  className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Cidade *
                </label>
                <input
                  name="address_city"
                  type="text"
                  required
                  value={formData.address_city}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Logradouro (Rua/Avenida) *
                </label>
                <input
                  name="address_street"
                  type="text"
                  required
                  value={formData.address_street}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Número *
                </label>
                <input
                  name="address_number"
                  type="text"
                  required
                  value={formData.address_number}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Bairro *
                </label>
                <input
                  name="address_district"
                  type="text"
                  required
                  value={formData.address_district}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Complemento (Opcional)
                </label>
                <input
                  name="address_complement"
                  type="text"
                  value={formData.address_complement}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2 border-t border-white/10 pt-6 mt-2">
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Segmento / Categoria *
                </label>
                <select
                  name="category_id"
                  required
                  value={formData.category_id}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                >
                  <option value="" className="bg-[#001144]">Selecione uma categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id} className="bg-[#001144]">
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  WhatsApp de Atendimento *
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    name="whatsapp"
                    type="text"
                    required
                    placeholder="(00) 00000-0000"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Logo / Imagem da Fachada
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative flex-1 w-full">
                    <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="thumbnail_url"
                      type="text"
                      placeholder="URL da imagem ou selecione um arquivo"
                      value={formData.thumbnail_url}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                    />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full sm:w-auto px-6 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {uploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Camera className="w-4 h-4 mr-2" />
                    )}
                    {uploading ? 'Enviando...' : 'Escolher Arquivo'}
                  </button>
                </div>
                {formData.thumbnail_url && (
                  <div className="mt-2 text-xs text-[#70ff00] flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Imagem selecionada com sucesso!
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Breve Descrição do Negócio *
                </label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  placeholder="Ex: Oferecemos as melhores pizzas artesanais da região com ingredientes selecionados."
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-white/20 rounded-lg placeholder-gray-400 text-white bg-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent resize-none"
                />
              </div>

              <div className="md:col-span-2 border-t border-white/10 pt-6 mt-2">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Site ou Instagram (Opcional)
                </label>
                <input
                  name="site_instagram"
                  type="text"
                  placeholder="@seu_perfil ou www.site.com.br"
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
