import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Building2, Users, TrendingUp, LogOut, Plus, Eye, AlertCircle, Edit2, Trash2, Lock, Unlock, Calendar, FileDown, Filter, Menu, X, Settings, MapPin, ShieldCheck, Camera } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Company {
  id: number;
  razao_social: string;
  nome_fantasia: string;
  email: string;
  cnpj: string;
  telefone?: string;
  responsavel?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_district?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  description?: string;
  whatsapp?: string;
  thumbnail_url?: string;
  latitude?: string;
  longitude?: string;
  role: string;
}

interface GalleryImage {
  id: string;
  image_url: string;
}

interface Cashier {
  id: number;
  name: string;
  cpf: string;
  is_active: boolean;
  last_access_at: string | null;
  created_at: string;
}

interface Purchase {
  id: number;
  cashier_name: string;
  customer_coupon: string;
  cashier_cpf: string;
  purchase_value: number;
  cashback_generated: number;
  purchase_date: string;
  purchase_time: string;
}

interface CompanyStats {
  total: {
    sales_count: number;
    sales_value: number;
    cashback_generated: number;
  };
  monthly: {
    sales_count: number;
    sales_value: number;
    cashback_generated: number;
  };
  cashback_percentage: number;
}

interface MonthlyData {
  month: string;
  sales_count: number;
  sales_value: number;
  cashback_generated: number;
}

export default function CompanyDashboard() {
  const [company, setCompany] = useState<Company | null>(null);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateCashier, setShowCreateCashier] = useState(false);
  const [showEditCashier, setShowEditCashier] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCashbackConfig, setShowCashbackConfig] = useState(false);
  const [newCashier, setNewCashier] = useState({ name: '', cpf: '', password: '' });
  const [editingCashier, setEditingCashier] = useState<{ id: number; name: string; password: string } | null>(null);
  const [deletingCashierId, setDeletingCashierId] = useState<number | null>(null);
  const [newCashbackPercentage, setNewCashbackPercentage] = useState('');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState<Partial<Company>>({});
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [directoryFormData, setDirectoryFormData] = useState({
    description: '',
    whatsapp: '',
    thumbnail_url: '',
    latitude: '',
    longitude: '',
    address_zip: '',
    address_street: '',
    address_number: '',
    address_district: '',
    address_city: '',
    address_state: ''
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const galleryFileInputRef = React.useRef<HTMLInputElement>(null);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  useEffect(() => {
    filterPurchases();
  }, [purchases, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    if (company) {
      const initialData = {
        description: company.description || '',
        whatsapp: company.whatsapp || '',
        thumbnail_url: company.thumbnail_url || '',
        latitude: company.latitude || '',
        longitude: company.longitude || '',
        address_zip: company.address_zip || '',
        address_street: company.address_street || '',
        address_number: company.address_number || '',
        address_district: company.address_district || '',
        address_city: company.address_city || '',
        address_state: company.address_state || ''
      };
      setDirectoryFormData(initialData);
      
      // Sincroniza também o formulário de dados básicos da empresa
      setProfileFormData({
        razao_social: company.razao_social || '',
        nome_fantasia: company.nome_fantasia || '',
        cnpj: company.cnpj || '',
        email: company.email || '',
        telefone: company.telefone || '',
        responsavel: company.responsavel || '',
        ...initialData
      });

      // Se tiver CEP mas não tiver coordenadas, busca automaticamente
      if (company.address_zip && (!company.latitude || !company.longitude)) {
        setTimeout(() => {
          handleAutoGetCoordinates(initialData);
        }, 500);
      }
      if (company.address_zip && (!company.latitude || !company.longitude)) {
        handleAutoGetCoordinates();
      }
    }
  }, [company]);

  // Função auxiliar para busca automática de coordenadas sem alert
  const handleAutoGetCoordinates = async (data = directoryFormData) => {
    if (!data) return;
    const { address_street, address_city, address_state, address_zip } = data;
    if (!address_zip && (!address_street || !address_city)) return;

    try {
      const query = address_street && address_city 
        ? `${address_street}, ${address_city}, ${address_state}, Brasil`
        : `${address_zip}, Brasil`;
        
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const geoData = await response.json();
      
      if (geoData && geoData.length > 0) {
        setDirectoryFormData(prev => ({
          ...prev,
          latitude: String(geoData[0].lat),
          longitude: String(geoData[0].lon)
        }));
      }
    } catch (err) {
      console.error('Auto geo error:', err);
    }
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('company_token');
      const response = await fetch('/api/empresa/me', { 
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Session-Token': token || ''
        },
        credentials: 'include' 
      });
      if (response.ok) {
        const data = await response.json();
        setCompany(data.company);
        fetchGallery();
      } else {
        navigate('/empresa/login');
      }
    } catch (e) {
      console.error(`[COMPANY_ME] Catch error:`, e)
      navigate('/empresa/login');
    }
  };

  const fetchGallery = async () => {
    try {
      const token = localStorage.getItem('company_token');
      const response = await fetch('/api/empresa/galeria', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setGallery(data);
      }
    } catch (err) {
      console.error('Error fetching gallery:', err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/empresa/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileFormData),
        credentials: 'include',
      });
      if (response.ok) {
        await checkAuth(); // Refresh company data
        setShowEditProfile(false);
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao atualizar perfil');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProfileFormData(prev => ({ ...prev, address_zip: value }));
    
    const cep = value.replace(/\D/g, '');
    if (cep.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setProfileFormData(prev => ({
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

  const handleDirectoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDirectoryFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDirectoryCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDirectoryFormData(prev => ({ ...prev, address_zip: value }));
    
    const cep = value.replace(/\D/g, '');
    if (cep.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          // Prepare address data
          const addressData = {
            address_zip: value,
            address_street: data.logradouro,
            address_district: data.bairro,
            address_city: data.localidade,
            address_state: data.uf
          };

          // Try to get coordinates automatically
          const query = `${data.logradouro}, ${data.localidade}, ${data.uf}, Brasil`;
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const geoData = await geoRes.json();
            
            if (geoData && geoData.length > 0) {
              setDirectoryFormData(prev => ({
                ...prev,
                ...addressData,
                latitude: String(geoData[0].lat),
                longitude: String(geoData[0].lon)
              }));
            } else {
              // Set address even if geo fails
              setDirectoryFormData(prev => ({ ...prev, ...addressData }));
            }
          } catch (geoErr) {
            console.error('Geo error:', geoErr);
            setDirectoryFormData(prev => ({ ...prev, ...addressData }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch CEP:', err);
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleGetCoordinates = async () => {
    const { address_street, address_number, address_city, address_state } = directoryFormData;
    if (!address_street || !address_city) {
      alert('Preencha pelo menos a rua e a cidade para buscar as coordenadas.');
      return;
    }

    setLoading(true);
    try {
      const query = `${address_street}, ${address_number}, ${address_city}, ${address_state}, Brasil`;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        setDirectoryFormData(prev => ({
          ...prev,
          latitude: data[0].lat,
          longitude: data[0].lon
        }));
        alert('Coordenadas encontradas e atualizadas!');
      } else {
        alert('Não foi possível encontrar as coordenadas para este endereço. Tente ajustar os dados.');
      }
    } catch (err) {
      console.error('Error fetching coordinates:', err);
      alert('Erro ao buscar coordenadas.');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectoryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { supabase } = await import('@/react-app/lib/supabase');
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      setDirectoryFormData(prev => ({ ...prev, thumbnail_url: publicUrl }));
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError('Erro ao enviar imagem: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { supabase } = await import('@/react-app/lib/supabase');
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `gallery/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('public')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('public')
          .getPublicUrl(filePath);

        return fetch('/api/empresa/galeria', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: publicUrl }),
          credentials: 'include',
        });
      });

      await Promise.all(uploadPromises);
      fetchGallery();
    } catch (err: any) {
      console.error('Error uploading to gallery:', err);
      setError('Erro ao enviar imagem: ' + err.message);
    } finally {
      setUploading(false);
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
    }
  };

  const handleDeleteGalleryImage = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;

    try {
      const response = await fetch(`/api/empresa/galeria/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchGallery();
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao excluir imagem');
      }
    } catch (err) {
      setError('Erro de conexão');
    }
  };

  const handleSaveDirectoryInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('company_token');
      const response = await fetch('/api/empresa/perfil', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(directoryFormData),
        credentials: 'include',
      });
      if (response.ok) {
        await checkAuth(); // Refresh data
        alert('Informações atualizadas com sucesso!');
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao atualizar informações');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const token = localStorage.getItem('company_token');
      const authHeader = { 'Authorization': `Bearer ${token}` };
      
      const [cashiersRes, purchasesRes, statsRes, monthlyRes] = await Promise.all([
        fetch('/api/empresa/caixas', { headers: authHeader, credentials: 'include' }),
        fetch('/api/empresa/relatorio', { headers: authHeader, credentials: 'include' }),
        fetch('/api/empresa/estatisticas', { headers: authHeader, credentials: 'include' }),
        fetch('/api/empresa/dados-mensais', { headers: authHeader, credentials: 'include' })
      ]);

      if (cashiersRes.ok) {
        const cashiersData = await cashiersRes.json();
        setCashiers(cashiersData.cashiers);
      }

      if (purchasesRes.ok) {
        const purchasesData = await purchasesRes.json();
        setPurchases(purchasesData.purchases);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        setNewCashbackPercentage(statsData.cashback_percentage.toString());
      }

      if (monthlyRes.ok) {
        const monthlyData = await monthlyRes.json();
        setMonthlyData(monthlyData.monthly_data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('company_token');
      const response = await fetch('/api/empresa/caixas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCashier),
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateCashier(false);
        setNewCashier({ name: '', cpf: '', password: '' });
        loadData();
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Erro de conexão. Tente novamente.');
    }
  };

  const handleEditCashier = (cashier: Cashier) => {
    setEditingCashier({ id: cashier.id, name: cashier.name, password: '' });
    setShowEditCashier(true);
    setError('');
  };

  const handleUpdateCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!editingCashier) return;

    try {
      const response = await fetch(`/api/empresa/caixas/${editingCashier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingCashier.name,
          password: editingCashier.password || undefined
        }),
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        setShowEditCashier(false);
        setEditingCashier(null);
        loadData();
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Erro de conexão. Tente novamente.');
    }
  };

  const handleToggleCashier = async (cashierId: number) => {
    try {
      const token = localStorage.getItem('company_token');
      const response = await fetch(`/api/empresa/caixas/${cashierId}/toggle`, { 
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include' 
      });

      const data = await response.json();
      if (data.success) {
        loadData();
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Toggle cashier error:', error);
    }
  };

  const handleDeleteCashier = async () => {
    if (!deletingCashierId) return;

    try {
      const token = localStorage.getItem('company_token');
      const response = await fetch(`/api/empresa/caixas/${deletingCashierId}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include' 
      });

      const data = await response.json();
      if (data.success) {
        setShowDeleteConfirm(false);
        setDeletingCashierId(null);
        loadData();
      } else {
        setError(data.error);
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      setError('Erro de conexão. Tente novamente.');
      setShowDeleteConfirm(false);
    }
  };

  const handleUpdateCashback = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const percentage = parseFloat(newCashbackPercentage);
    if (percentage < 1 || percentage > 20) {
      setError('Percentual deve estar entre 1% e 20%');
      return;
    }

    try {
      const response = await fetch('/api/empresa/cashback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cashback_percentage: percentage }),
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        setShowCashbackConfig(false);
        loadData();
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Erro de conexão. Tente novamente.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/empresa/logout', { method: 'POST', credentials: 'include' });
    navigate('/empresa/login');
  };

  const activeCashiers = cashiers.filter(c => c.is_active).length;

  const filterPurchases = () => {
    if (!purchases.length) {
      setFilteredPurchases([]);
      return;
    }

    let filtered = purchases;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case 'today':
        filtered = purchases.filter(p => {
          const purchaseDate = new Date(p.purchase_date);
          return purchaseDate >= today;
        });
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        filtered = purchases.filter(p => {
          const purchaseDate = new Date(p.purchase_date);
          return purchaseDate >= yesterday && purchaseDate < today;
        });
        break;
      case 'last7':
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);
        filtered = purchases.filter(p => {
          const purchaseDate = new Date(p.purchase_date);
          return purchaseDate >= last7Days;
        });
        break;
      case 'last15':
        const last15Days = new Date(today);
        last15Days.setDate(last15Days.getDate() - 15);
        filtered = purchases.filter(p => {
          const purchaseDate = new Date(p.purchase_date);
          return purchaseDate >= last15Days;
        });
        break;
      case 'last30':
        const last30Days = new Date(today);
        last30Days.setDate(last30Days.getDate() - 30);
        filtered = purchases.filter(p => {
          const purchaseDate = new Date(p.purchase_date);
          return purchaseDate >= last30Days;
        });
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999); // Include end date completely
          filtered = purchases.filter(p => {
            const purchaseDate = new Date(p.purchase_date);
            return purchaseDate >= startDate && purchaseDate <= endDate;
          });
        }
        break;
      default:
        filtered = purchases;
    }

    setFilteredPurchases(filtered);
  };

  const getFilteredStats = () => {
    if (!filteredPurchases.length) return { totalSales: 0, totalCashback: 0, transactionCount: 0 };
    
    return {
      totalSales: filteredPurchases.reduce((sum, p) => sum + p.purchase_value, 0),
      totalCashback: filteredPurchases.reduce((sum, p) => sum + p.cashback_generated, 0),
      transactionCount: filteredPurchases.length
    };
  };

  const getDailyData = () => {
    if (!filteredPurchases.length) return [];
    
    const dailyMap = new Map();
    
    filteredPurchases.forEach(purchase => {
      const date = purchase.purchase_date;
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          sales: 0,
          cashback: 0,
          transactions: 0
        });
      }
      const day = dailyMap.get(date);
      day.sales += purchase.purchase_value;
      day.cashback += purchase.cashback_generated;
      day.transactions += 1;
    });
    
    return Array.from(dailyMap.values()).sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    });
  };

  const generatePDFReport = () => {
    const pdf = new jsPDF();
    const filteredStats = getFilteredStats();
    
    // Header
    pdf.setFillColor(112, 255, 0); // #70ff00
    pdf.rect(0, 0, 210, 30, 'F');
    
    pdf.setTextColor(0, 17, 68); // #001144
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CashMais - Relatório de Vendas', 20, 20);
    
    pdf.setTextColor(0, 17, 68);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Empresa: ${company?.nome_fantasia || 'N/A'}`, 20, 25);
    
    // Date range
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    let dateRangeText = 'Período: ';
    switch (dateFilter) {
      case 'today': dateRangeText += 'Hoje'; break;
      case 'yesterday': dateRangeText += 'Ontem'; break;
      case 'last7': dateRangeText += 'Últimos 7 dias'; break;
      case 'last15': dateRangeText += 'Últimos 15 dias'; break;
      case 'last30': dateRangeText += 'Últimos 30 dias'; break;
      case 'custom': dateRangeText += `${customStartDate} a ${customEndDate}`; break;
      default: dateRangeText += 'Todos os registros';
    }
    pdf.text(dateRangeText, 20, 45);
    pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, 52);
    
    // Summary box
    pdf.setDrawColor(112, 255, 0);
    pdf.setLineWidth(1);
    pdf.rect(20, 60, 170, 35);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Resumo do Período', 25, 70);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total de Transações: ${filteredStats.transactionCount}`, 25, 78);
    pdf.text(`Total de Vendas: R$ ${filteredStats.totalSales.toFixed(2)}`, 25, 84);
    pdf.text(`Total de Cashback: R$ ${filteredStats.totalCashback.toFixed(2)}`, 25, 90);
    
    // Table
    const tableData = filteredPurchases.map(purchase => [
      new Date(`${purchase.purchase_date} ${purchase.purchase_time}`).toLocaleString('pt-BR'),
      purchase.cashier_name,
      purchase.customer_coupon,
      `R$ ${purchase.purchase_value.toFixed(2)}`,
      `R$ ${purchase.cashback_generated.toFixed(2)}`
    ]);
    
    autoTable(pdf, {
      startY: 105,
      head: [['Data/Hora', 'Caixa', 'CPF Cliente', 'Valor da Venda', 'Cashback']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [112, 255, 0],
        textColor: [0, 17, 68],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { left: 20, right: 20 },
      styles: {
        fontSize: 9,
        cellPadding: 3
      }
    });
    
    // Footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
      pdf.text('CashMais © 2024', 20, 285);
    }
    
    pdf.save(`cashmais-relatorio-${dateFilter}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#70ff00] mx-auto"></div>
          <p className="mt-4 text-gray-300">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011] flex flex-col lg:flex-row">
      {/* Mobile Header (Hambúrguer) - Visible only on mobile/tablet */}
      <div className="lg:hidden bg-black/40 backdrop-blur-xl border-b border-white/10 p-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img src="https://mocha-cdn.com/01995053-6d08-799d-99f1-d9898351a40a/Design-sem-nome.png" alt="CashMais" className="h-8 w-auto" />
          <h1 className="text-lg font-bold text-white">Empresas</h1>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 text-gray-300 hover:text-[#70ff00] focus:outline-none focus:ring-2 focus:ring-[#70ff00]/50 rounded-lg transition-all"
          aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[65px] bg-black/60 backdrop-blur-md z-40 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-[#001144]/95 border-b border-white/10 p-6 space-y-6 shadow-2xl">
            <nav className="space-y-4">
              {[
                { key: 'overview', label: 'Visão Geral', icon: TrendingUp },
                { key: 'cashiers', label: 'Caixas', icon: Users },
                { key: 'reports', label: 'Relatórios', icon: Eye },
                { key: 'directory', label: 'Meu Perfil Público', icon: Building2 },
                { key: 'settings', label: 'Configurações', icon: Settings }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveTab(key);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-4 p-4 rounded-xl font-medium text-base transition-all ${
                    activeTab === key
                      ? 'bg-[#70ff00]/20 text-[#70ff00] border border-[#70ff00]/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>

            <div className="pt-6 border-t border-white/10">
              <div className="px-4 mb-6">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Empresa</p>
                <p className="text-lg text-white font-medium">{company?.nome_fantasia}</p>
                <p className="text-sm text-gray-400">ID: {company?.id}</p>
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center space-x-2 p-4 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all font-bold"
              >
                <LogOut className="h-5 w-5" />
                <span>Sair do Sistema</span>
              </button>
            </div>
          </div>
          {/* Overlay to close when clicking outside */}
          <div className="h-full" onClick={() => setIsMenuOpen(false)}></div>
        </div>
      )}

      {/* Sidebar - Desktop Only */}
      <div className="hidden lg:flex w-80 bg-black/20 backdrop-blur-xl border-r border-white/10 flex-col sticky top-0 h-screen">
        {/* Logo e Nome do Sistema */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <img src="https://mocha-cdn.com/01995053-6d08-799d-99f1-d9898351a40a/Design-sem-nome.png" alt="CashMais" className="h-10 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-white">Empresas</h1>
            </div>
          </div>
        </div>

        {/* Menu de Navegação */}
        <div className="flex-1 py-6">
          <nav className="space-y-2 px-4">
            {[
              { key: 'overview', label: 'Visão Geral', icon: TrendingUp },
              { key: 'cashiers', label: 'Caixas', icon: Users },
              { key: 'reports', label: 'Relatórios', icon: Eye },
              { key: 'directory', label: 'Meu Perfil Público', icon: Building2 },
              { key: 'settings', label: 'Configurações', icon: Settings }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                  activeTab === key
                    ? 'bg-[#70ff00]/20 text-[#70ff00] shadow-lg shadow-[#70ff00]/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Informações da Empresa e Sair */}
        <div className="p-4 border-t border-white/10">
          <div className="mb-3">
            <p className="text-xs text-gray-400">Empresa</p>
            <p className="text-sm text-white font-medium">{company?.nome_fantasia}</p>
            <p className="text-xs text-gray-500">ID: {company?.id}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-red-500/10 rounded-lg transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </div>

      {/* Área de Conteúdo Principal */}
      <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
        {/* Conteúdo das Abas */}
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            {/* Summary Stats */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Panorama Geral</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-500/20 text-purple-400">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-300">Total de Vendas</p>
                      <p className="text-2xl font-bold text-white">R$ {stats.total.sales_value.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{stats.total.sales_count} transações</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-yellow-500/20 text-yellow-400">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-300">Cashback Total</p>
                      <p className="text-2xl font-bold text-white">R$ {stats.total.cashback_generated.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">Lifetime total</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-[#70ff00]/20 text-[#70ff00]">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-300">Caixas Ativos</p>
                      <p className="text-2xl font-bold text-white">{activeCashiers}</p>
                      <p className="text-xs text-gray-400">de {cashiers.length} total</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="space-y-8">
              <h3 className="text-lg font-medium text-white">Gráficos de Vendas</h3>
              
              {/* Monthly Performance Chart */}
              {monthlyData.length > 0 && (
                <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
                  <h4 className="text-white font-medium mb-4">Performance Mensal (Últimos 6 Meses)</h4>
                  <div className="h-80" style={{ minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#ffffff80" 
                          fontSize={12}
                        />
                        <YAxis stroke="#ffffff80" fontSize={12} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#001144',
                            border: '1px solid #70ff00',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          formatter={(value, name) => [
                            name === 'sales_value' ? `R$ ${Number(value).toFixed(2)}` : 
                            name === 'cashback_generated' ? `R$ ${Number(value).toFixed(2)}` :
                            value,
                            name === 'sales_value' ? 'Vendas' :
                            name === 'sales_count' ? 'Transações' :
                            'Cashback'
                          ]}
                        />
                        <Legend 
                          wrapperStyle={{ color: '#ffffff80' }}
                          formatter={(value) => value === 'sales_value' ? 'Vendas (R$)' : 
                                     value === 'sales_count' ? 'Transações' : 'Cashback (R$)'}
                        />
                        <Bar dataKey="sales_value" fill="#70ff00" name="sales_value" />
                        <Bar dataKey="cashback_generated" fill="#00ff70" name="cashback_generated" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Sales vs Cashback Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
                  <h4 className="text-white font-medium mb-4">Evolução de Vendas</h4>
                  <div className="h-64" style={{ minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height={256}>
                      <LineChart data={monthlyData.length > 0 ? monthlyData : [{
                        month: 'Atual',
                        sales_value: stats.monthly.sales_value,
                        sales_count: stats.monthly.sales_count
                      }]}> 
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#ffffff80" 
                          fontSize={12}
                        />
                        <YAxis stroke="#ffffff80" fontSize={12} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#001144',
                            border: '1px solid #70ff00',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Vendas']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="sales_value" 
                          stroke="#70ff00" 
                          strokeWidth={2} 
                          dot={{ fill: '#70ff00', strokeWidth: 2, r: 4 }} 
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
                  <h4 className="text-white font-medium mb-4">Distribuição de Valores</h4>
                  <div className="h-64" style={{ minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height={256}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Vendas', value: stats.monthly.sales_value, color: '#70ff00' },
                            { name: 'Cashback', value: stats.monthly.cashback_generated, color: '#00ff70' }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: R$ ${Number(value).toFixed(2)}`}
                          labelLine={false}
                        >
                          <Cell fill="#70ff00" />
                          <Cell fill="#00ff70" />
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#001144',
                            border: '1px solid #70ff00',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Directory (Public Profile) Tab */}
        {activeTab === 'directory' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Meu Perfil Público</h2>
              <p className="text-[#70ff00]">Gerencie como os clientes veem sua empresa no diretório</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Info */}
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8">
                  <h3 className="text-lg font-bold text-white mb-6">Informações Gerais</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Descrição da Empresa</label>
                      <textarea 
                        name="description"
                        rows={6}
                        className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-white focus:border-[#70ff00] outline-none transition-all"
                        placeholder="Conte sobre seus serviços, experiência e diferenciais..."
                        value={directoryFormData.description}
                        onChange={handleDirectoryChange}
                      ></textarea>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">WhatsApp de Atendimento</label>
                        <input 
                          name="whatsapp"
                          type="text"
                          className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-white focus:border-[#70ff00] outline-none transition-all"
                          value={directoryFormData.whatsapp}
                          onChange={handleDirectoryChange}
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Logo / Imagem Principal</label>
                        <div className="flex flex-col gap-3">
                          {directoryFormData.thumbnail_url ? (
                            <div className="relative w-full aspect-video rounded-2xl overflow-hidden group bg-black/40 border border-white/10">
                              <img 
                                src={directoryFormData.thumbnail_url} 
                                alt="Logo Preview" 
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white"
                                  title="Trocar Imagem"
                                >
                                  <Camera className="w-5 h-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDirectoryFormData(prev => ({ ...prev, thumbnail_url: '' }))}
                                  className="p-2 bg-red-500/50 hover:bg-red-500/80 rounded-full transition-colors text-white"
                                  title="Remover"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                              className="w-full aspect-video bg-black/20 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#70ff00]/50 hover:text-white transition-all group"
                            >
                              <div className="p-4 bg-white/5 rounded-full group-hover:bg-[#70ff00]/10 group-hover:text-[#70ff00] transition-colors">
                                {uploading ? (
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
                                ) : (
                                  <Camera className="w-8 h-8" />
                                )}
                              </div>
                              <span className="text-sm font-medium">Clique para subir logo</span>
                            </button>
                          )}
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleDirectoryFileChange}
                            accept="image/*"
                            className="hidden"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center justify-between">
                    Galeria de Fotos
                    <button 
                      onClick={() => galleryFileInputRef.current?.click()}
                      disabled={uploading}
                      className="text-sm bg-[#70ff00]/10 text-[#70ff00] px-4 py-1.5 rounded-lg border border-[#70ff00]/20 hover:bg-[#70ff00] hover:text-[#001144] transition-all disabled:opacity-50"
                    >
                      {uploading ? 'Subindo...' : '+ Adicionar Foto'}
                    </button>
                    <input
                      type="file"
                      ref={galleryFileInputRef}
                      onChange={handleGalleryUpload}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {gallery.length > 0 ? gallery.map((img) => (
                      <div key={img.id} className="aspect-square bg-black/20 rounded-2xl border border-white/5 group relative overflow-hidden">
                        <img 
                          src={img.image_url} 
                          alt="Gallery" 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <button 
                          onClick={() => handleDeleteGalleryImage(img.id)}
                          className="absolute top-2 right-2 p-2 bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )) : (
                      <div className="aspect-square bg-black/20 rounded-2xl border border-white/5 flex items-center justify-center group relative overflow-hidden">
                        <span className="text-gray-600">Vazio</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Location & Verification */}
              <div className="space-y-8">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8">
                  <h3 className="text-lg font-bold text-white mb-6">Endereço de Atendimento</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-[10px] uppercase font-bold mb-1">CEP</label>
                        <div className="relative">
                          <input 
                            name="address_zip"
                            type="text" 
                            maxLength={9}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-[#70ff00] outline-none" 
                            value={directoryFormData.address_zip} 
                            onChange={handleDirectoryCepChange}
                          />
                          {cepLoading && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-gray-400 text-[10px] uppercase font-bold mb-1">Estado (UF)</label>
                        <input 
                          name="address_state"
                          type="text" 
                          maxLength={2}
                          className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm" 
                          value={directoryFormData.address_state} 
                          onChange={handleDirectoryChange}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-[10px] uppercase font-bold mb-1">Cidade</label>
                      <input 
                        name="address_city"
                        type="text" 
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm" 
                        value={directoryFormData.address_city} 
                        onChange={handleDirectoryChange}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-[10px] uppercase font-bold mb-1">Logradouro (Rua/Av)</label>
                      <input 
                        name="address_street"
                        type="text" 
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm" 
                        value={directoryFormData.address_street} 
                        onChange={handleDirectoryChange}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-[10px] uppercase font-bold mb-1">Número</label>
                        <input 
                          name="address_number"
                          type="text" 
                          className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm" 
                          value={directoryFormData.address_number} 
                          onChange={handleDirectoryChange}
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-[10px] uppercase font-bold mb-1">Bairro</label>
                        <input 
                          name="address_district"
                          type="text" 
                          className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm" 
                          value={directoryFormData.address_district} 
                          onChange={handleDirectoryChange}
                        />
                      </div>
                    </div>
                    
                    <div className="pt-6 border-t border-white/10">
                      <h4 className="text-white text-sm font-bold mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#70ff00]" />
                        Localização no Mapa
                      </h4>
                      
                      <div className="aspect-video bg-black/40 rounded-2xl border border-white/10 overflow-hidden relative">
                        {directoryFormData.latitude && directoryFormData.longitude ? (
                          <iframe
                            key={`${directoryFormData.latitude}-${directoryFormData.longitude}`}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            src={`https://maps.google.com/maps?q=${directoryFormData.latitude},${directoryFormData.longitude}&z=15&output=embed`}
                          ></iframe>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
                            <MapPin className="w-8 h-8 opacity-20" />
                            <span className="text-xs">Aguardando endereço para carregar mapa...</span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-[10px] text-gray-500 mt-3 italic">
                        * O mapa é atualizado automaticamente ao digitar o CEP ou endereço.
                      </p>
                    </div>
                  </div>
                </div>

                {company?.is_verified ? (
                  <div className="bg-[#70ff00]/10 border border-[#70ff00]/30 rounded-3xl p-6 flex items-start gap-4 shadow-lg shadow-[#70ff00]/5">
                    <ShieldCheck className="w-10 h-10 text-[#70ff00] shrink-0" />
                    <div>
                      <p className="text-[#70ff00] font-black text-sm italic uppercase">Perfil Verificado</p>
                      <p className="text-white/60 text-xs mt-1 leading-relaxed">Sua empresa possui o selo de confiança CashMais.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-600/10 border border-blue-500/30 rounded-3xl p-6 flex items-start gap-4">
                    <AlertCircle className="w-10 h-10 text-blue-400 shrink-0" />
                    <div>
                      <p className="text-white font-bold text-sm">Solicitar Verificação</p>
                      <p className="text-blue-400/80 text-xs mt-1 leading-relaxed">Complete seu perfil e galeria para solicitar o selo de verificado.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={handleSaveDirectoryInfo}
                disabled={loading}
                className="bg-[#70ff00] text-[#001144] px-12 py-4 rounded-2xl font-black text-lg shadow-xl shadow-[#70ff00]/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
              </button>
            </div>
          </div>
        )}

        {/* Cashiers Tab */}
        {activeTab === 'cashiers' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-white">Gerenciar Caixas</h2>
              <button
                onClick={() => setShowCreateCashier(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-[#70ff00] to-[#50cc00] text-white px-4 py-2 rounded-lg hover:from-[#50cc00] hover:to-[#70ff00] transition-all duration-200"
              >
                <Plus className="h-5 w-5" />
                <span>Novo Caixa</span>
              </button>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      CPF
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Último Acesso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {cashiers.map((cashier) => (
                    <tr key={cashier.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {cashier.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {cashier.cpf}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cashier.is_active ? 'bg-[#70ff00]/20 text-[#70ff00]' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {cashier.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {cashier.last_access_at 
                          ? new Date(cashier.last_access_at).toLocaleDateString('pt-BR')
                          : 'Nunca acessou'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditCashier(cashier)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleCashier(cashier.id)}
                            className={`p-2 rounded-lg transition-all ${
                              cashier.is_active 
                                ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10' 
                                : 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
                            }`}
                            title={cashier.is_active ? 'Bloquear' : 'Desbloquear'}
                          >
                            {cashier.is_active ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => {
                              setDeletingCashierId(cashier.id);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-white">Relatório de Vendas</h2>
              <button
                onClick={generatePDFReport}
                className="flex items-center space-x-2 bg-gradient-to-r from-[#70ff00] to-[#50cc00] text-white px-4 py-2 rounded-lg hover:from-[#50cc00] hover:to-[#70ff00] transition-all duration-200"
              >
                <FileDown className="h-5 w-5" />
                <span>Gerar PDF</span>
              </button>
            </div>

            {/* Date Filters */}
            <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Filter className="h-5 w-5 text-[#70ff00]" />
                <h3 className="text-white font-medium">Filtros por Data</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'today', label: 'Hoje' },
                  { key: 'yesterday', label: 'Ontem' },
                  { key: 'last7', label: 'Últimos 7 dias' },
                  { key: 'last15', label: 'Últimos 15 dias' },
                  { key: 'last30', label: 'Últimos 30 dias' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setDateFilter(key)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      dateFilter === key
                        ? 'bg-[#70ff00] text-[#001144]'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Custom Date Range */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setDateFilter('custom')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    dateFilter === 'custom'
                      ? 'bg-[#70ff00] text-[#001144]'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  Período Personalizado
                </button>
                {dateFilter === 'custom' && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="px-3 py-2 border border-white/20 rounded-lg bg-white/10 backdrop-blur-md text-white focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                      />
                    </div>
                    <span className="text-gray-400">até</span>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="px-3 py-2 border border-white/20 rounded-lg bg-white/10 backdrop-blur-md text-white focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-500/20 text-blue-400">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-300">Transações</p>
                    <p className="text-2xl font-bold text-white">{getFilteredStats().transactionCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-500/20 text-green-400">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-300">Total Vendas</p>
                    <p className="text-2xl font-bold text-white">R$ {getFilteredStats().totalSales.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-[#70ff00]/20 text-[#70ff00]">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-300">Total Cashback</p>
                    <p className="text-2xl font-bold text-white">R$ {getFilteredStats().totalCashback.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            {filteredPurchases.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Sales Chart */}
                <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
                  <h4 className="text-white font-medium mb-4">Vendas por Dia</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getDailyData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                        <XAxis dataKey="date" stroke="#ffffff80" fontSize={12} />
                        <YAxis stroke="#ffffff80" fontSize={12} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#001144',
                            border: '1px solid #70ff00',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          formatter={(value, name) => [
                            name === 'sales' ? `R$ ${Number(value).toFixed(2)}` : 
                            name === 'cashback' ? `R$ ${Number(value).toFixed(2)}` : value,
                            name === 'sales' ? 'Vendas' :
                            name === 'cashback' ? 'Cashback' : 'Transações'
                          ]}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="sales" 
                          stroke="#70ff00" 
                          fill="#70ff0020" 
                          name="Vendas"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="cashback" 
                          stroke="#00ff70" 
                          fill="#00ff7020" 
                          name="Cashback"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Transaction Distribution Chart */}
                <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
                  <h4 className="text-white font-medium mb-4">Distribuição de Transações</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getDailyData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                        <XAxis dataKey="date" stroke="#ffffff80" fontSize={12} />
                        <YAxis stroke="#ffffff80" fontSize={12} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#001144',
                            border: '1px solid #70ff00',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          formatter={(value) => [value, 'Transações']}
                        />
                        <Bar dataKey="transactions" fill="#70ff00" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
            
            {/* Data Table */}
            <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 overflow-hidden">
              <div className="bg-white/5 px-6 py-4 border-b border-white/10">
                <h4 className="text-white font-medium">
                  Detalhes das Transações ({filteredPurchases.length} registros)
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Data/Hora
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Caixa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        CPF Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Cashback
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredPurchases.length > 0 ? filteredPurchases.map((purchase) => (
                      <tr key={purchase.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {new Date(`${purchase.purchase_date} ${purchase.purchase_time}`).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {purchase.cashier_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {purchase.customer_coupon}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          R$ {purchase.purchase_value.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#70ff00] font-medium">
                          R$ {purchase.cashback_generated.toFixed(2)}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                          Nenhuma transação encontrada para o período selecionado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && stats && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-white">Configurações da Empresa</h2>
            
            <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium mb-2">Percentual de Cashback</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Atualmente configurado em {stats.cashback_percentage}% das vendas
                  </p>
                  <p className="text-gray-400 text-xs">
                    O cashback é distribuído em 10 níveis da rede de afiliados. 
                    Afiliados precisam ter pelo menos 3 indicados diretos para receber comissões de rede.
                  </p>
                </div>
                <button
                  onClick={() => setShowCashbackConfig(true)}
                  className="bg-gradient-to-r from-[#70ff00] to-[#50cc00] text-white px-4 py-2 rounded-lg hover:from-[#50cc00] hover:to-[#70ff00] transition-all duration-200"
                >
                  Alterar Percentual
                </button>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium">Informações da Empresa</h3>
                <button
                  onClick={() => {
                    if (company) {
                      setProfileFormData(company);
                      setShowEditProfile(true);
                    }
                  }}
                  className="text-[#70ff00] hover:text-[#50cc00] text-sm flex items-center gap-1"
                >
                  <Edit2 className="h-4 w-4" />
                  Editar Perfil
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Razão Social</p>
                  <p className="text-white">{company?.razao_social}</p>
                </div>
                <div>
                  <p className="text-gray-400">CNPJ</p>
                  <p className="text-white">{company?.cnpj}</p>
                </div>
                <div>
                  <p className="text-gray-400">Email (Login)</p>
                  <p className="text-white">{company?.email}</p> 
                </div>
                <div>
                  <p className="text-gray-400">Responsável</p>
                  <p className="text-white">{company?.responsavel || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Telefone</p>
                  <p className="text-white">{company?.telefone || 'Não informado'}</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                <h4 className="text-white font-medium mb-3">Endereço</h4>
                {company?.address_street ? (
                  <div className="text-sm text-gray-300">
                    <p>{company.address_street}, {company.address_number}</p>
                    {company.address_complement && <p>{company.address_complement}</p>}
                    <p>{company.address_district}</p>
                    <p>{company.address_city} - {company.address_state}</p>
                    <p>CEP: {company.address_zip}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 p-3 rounded-lg border border-amber-400/20">
                    <AlertCircle className="h-5 w-5" />
                    <p className="text-sm">Endereço incompleto. Isso impedirá a geração de boletos de comissão.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
              <h3 className="text-white font-medium mb-4">Regras do Sistema</h3>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-[#70ff00] rounded-full mt-2"></div>
                  <div>
                    <strong>Ganhos de Rede:</strong> Afiliados só recebem comissões de rede após indicar pelo menos 3 pessoas diretamente
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-[#70ff00] rounded-full mt-2"></div>
                  <div>
                    <strong>Distribuição:</strong> Cashback é distribuído em 10 níveis (10% nível 1, 5% níveis 2-10)
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-[#70ff00] rounded-full mt-2"></div>
                  <div>
                    <strong>Saques:</strong> Permitidos apenas nos dias 10 e 15 de cada mês, máximo 1 por mês
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-[#70ff00] rounded-full mt-2"></div>
                  <div>
                    <strong>Taxa de Administração:</strong> 30% retido para a plataforma, 70% disponível para o afiliado
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cashback Configuration Modal */}
        {showCashbackConfig && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#001144] backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Configurar Cashback</h3>
              
              <form onSubmit={handleUpdateCashback} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Percentual (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    required
                    value={newCashbackPercentage}
                    onChange={(e) => setNewCashbackPercentage(e.target.value)}
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 backdrop-blur-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                    placeholder="5.0"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Mínimo: 1% | Máximo: 20%
                  </p>
                </div>

                {error && (
                  <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-800/50">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCashbackConfig(false);
                      setError('');
                      if (stats) setNewCashbackPercentage(stats.cashback_percentage.toString());
                    }}
                    className="flex-1 py-2 px-4 border border-white/20 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-[#70ff00] to-[#50cc00] text-white rounded-lg hover:from-[#50cc00] hover:to-[#70ff00] transition-all duration-200"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Cashier Modal */}
        {showEditCashier && editingCashier && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-white mb-4">Editar Caixa</h3>
              
              <form onSubmit={handleUpdateCashier} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCashier.name}
                    onChange={(e) => setEditingCashier(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 backdrop-blur-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                    placeholder="Digite o nome completo"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Nova Senha (deixe em branco para manter a atual)
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    value={editingCashier.password}
                    onChange={(e) => setEditingCashier(prev => prev ? { ...prev, password: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 backdrop-blur-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                {error && (
                  <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-800/50">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditCashier(false);
                      setEditingCashier(null);
                      setError('');
                    }}
                    className="flex-1 py-2 px-4 border border-white/20 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-[#70ff00] to-[#50cc00] text-white rounded-lg hover:from-[#50cc00] hover:to-[#70ff00] transition-all duration-200"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-white">Confirmar Exclusão</h3>
              </div>
              
              <p className="text-gray-300 mb-6">
                Tem certeza que deseja excluir este caixa? Esta ação não pode ser desfeita.
                {error && (
                  <span className="block mt-2 text-red-400 text-sm">{error}</span>
                )}
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingCashierId(null);
                    setError('');
                  }}
                  className="flex-1 py-2 px-4 border border-white/20 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteCashier}
                  className="flex-1 py-2 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Cashier Modal */}
        {showCreateCashier && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-white mb-4">Criar Novo Caixa</h3>
              
              <form onSubmit={handleCreateCashier} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={newCashier.name}
                    onChange={(e) => setNewCashier(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 backdrop-blur-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                    placeholder="Digite o nome completo"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    required
                    value={newCashier.cpf}
                    onChange={(e) => setNewCashier(prev => ({ ...prev, cpf: e.target.value }))}
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 backdrop-blur-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                    placeholder="000.000.000-00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Senha
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newCashier.password}
                    onChange={(e) => setNewCashier(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 backdrop-blur-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#70ff00] focus:border-transparent"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                {error && (
                  <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-800/50">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCashier(false);
                      setError('');
                      setNewCashier({ name: '', cpf: '', password: '' });
                    }}
                    className="flex-1 py-2 px-4 border border-white/20 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-[#70ff00] to-[#50cc00] text-white rounded-lg hover:from-[#50cc00] hover:to-[#70ff00] transition-all duration-200"
                  >
                    Criar Caixa
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Edit Profile Modal */}
        {showEditProfile && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-2xl w-full mx-4 overflow-y-auto max-h-[90vh]">
              <h3 className="text-xl font-semibold text-white mb-6">Editar Perfil da Empresa</h3>
              
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">Nome Fantasia</label>
                    <input
                      type="text"
                      required
                      value={profileFormData.nome_fantasia || ''}
                      onChange={(e) => setProfileFormData(prev => ({ ...prev, nome_fantasia: e.target.value }))}
                      className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#70ff00]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">Razão Social</label>
                    <input
                      type="text"
                      required
                      value={profileFormData.razao_social || ''}
                      onChange={(e) => setProfileFormData(prev => ({ ...prev, razao_social: e.target.value }))}
                      className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#70ff00]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">Responsável</label>
                    <input
                      type="text"
                      required
                      value={profileFormData.responsavel || ''}
                      onChange={(e) => setProfileFormData(prev => ({ ...prev, responsavel: e.target.value }))}
                      className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#70ff00]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">Telefone</label>
                    <input
                      type="text"
                      required
                      value={profileFormData.telefone || ''}
                      onChange={(e) => setProfileFormData(prev => ({ ...prev, telefone: e.target.value }))}
                      className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#70ff00]"
                    />
                  </div>

                  <div className="md:col-span-2 border-t border-white/10 pt-4 mt-2">
                    <h4 className="text-white font-medium mb-4">Endereço</h4>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">CEP</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        maxLength={9}
                        value={profileFormData.address_zip || ''}
                        onChange={handleProfileCepChange}
                        className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#70ff00]"
                      />
                      {cepLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">Estado (UF)</label>
                    <input
                      type="text"
                      required
                      maxLength={2}
                      value={profileFormData.address_state || ''}
                      onChange={(e) => setProfileFormData(prev => ({ ...prev, address_state: e.target.value }))}
                      className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#70ff00]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-200 mb-1">Cidade</label>
                    <input
                      type="text"
                      required
                      value={profileFormData.address_city || ''}
                      onChange={(e) => setProfileFormData(prev => ({ ...prev, address_city: e.target.value }))}
                      className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#70ff00]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-200 mb-1">Logradouro</label>
                    <input
                      type="text"
                      required
                      value={profileFormData.address_street || ''}
                      onChange={(e) => setProfileFormData(prev => ({ ...prev, address_street: e.target.value }))}
                      className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#70ff00]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">Número</label>
                    <input
                      type="text"
                      required
                      value={profileFormData.address_number || ''}
                      onChange={(e) => setProfileFormData(prev => ({ ...prev, address_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#70ff00]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1">Bairro</label>
                    <input
                      type="text"
                      required
                      value={profileFormData.address_district || ''}
                      onChange={(e) => setProfileFormData(prev => ({ ...prev, address_district: e.target.value }))}
                      className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#70ff00]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-200 mb-1">Complemento</label>
                    <input
                      type="text"
                      value={profileFormData.address_complement || ''}
                      onChange={(e) => setProfileFormData(prev => ({ ...prev, address_complement: e.target.value }))}
                      className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#70ff00]"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-800/50">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditProfile(false);
                      setProfileFormData({});
                      setError('');
                    }}
                    className="flex-1 py-2 px-4 border border-white/20 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-[#70ff00] to-[#50cc00] text-white rounded-lg hover:from-[#50cc00] hover:to-[#70ff00] transition-all duration-200"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
