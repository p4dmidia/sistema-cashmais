import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { User, LogOut, ShoppingCart, AlertCircle, CheckCircle, Ticket, DollarSign } from 'lucide-react';

interface Cashier {
  id: number;
  name: string;
  cpf: string;
  company_name: string;
  role: string;
}

export default function CashierPage() {
  const [cashier, setCashier] = useState<Cashier | null>(null);
  const [customerCoupon, setCustomerCoupon] = useState('');
  const [purchaseValue, setPurchaseValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/caixa/me', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCashier(data.cashier);
      } else {
        navigate('/caixa/login');
      }
    } catch (error) {
      navigate('/caixa/login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/caixa/compra', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_coupon: customerCoupon.trim(),
          purchase_value: parseFloat(purchaseValue)
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        setCustomerCoupon('');
        setPurchaseValue('');
      } else {
        setError(data.error || 'Erro ao registrar compra');
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/caixa/logout', { method: 'POST', credentials: 'include' });
    navigate('/empresa/login');
  };

  if (!cashier) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-300">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm shadow-sm border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <User className="h-8 w-8 text-emerald-400" />
              <div className="ml-3">
                <h1 className="text-xl font-semibold text-white">{cashier.name}</h1>
                <p className="text-sm text-slate-300">{cashier.company_name} - Caixa</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-slate-300 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-slate-700">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-emerald-500 rounded-full flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 text-white" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-white">Registrar Compra</h2>
            <p className="mt-2 text-slate-300">Digite os dados da venda para gerar cashback</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="customerCoupon" className="block text-sm font-medium text-white mb-2">
                CPF do Cliente *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Ticket className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="customerCoupon"
                  type="text"
                  required
                  value={customerCoupon}
                  onChange={(e) => setCustomerCoupon(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-600 bg-slate-700/50 rounded-lg placeholder-slate-400 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg font-mono"
                  placeholder="000.000.000-00"
                />
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Digite o CPF do cliente (com ou sem pontos e traços)
              </p>
            </div>

            <div>
              <label htmlFor="purchaseValue" className="block text-sm font-medium text-white mb-2">
                Valor da Compra (R$) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="purchaseValue"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={purchaseValue}
                  onChange={(e) => setPurchaseValue(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-600 bg-slate-700/50 rounded-lg placeholder-slate-400 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg"
                  placeholder="0.00"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {message && (
              <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-4 rounded-lg border border-green-200">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium">{message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !customerCoupon.trim() || !purchaseValue}
              className="w-full flex justify-center py-4 px-6 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processando...
                </div>
              ) : (
                'Registrar Compra'
              )}
            </button>
          </form>

          <div className="mt-8 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <h3 className="text-sm font-medium text-emerald-400 mb-2">⚠️ Importante:</h3>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• O CPF é o cupom de desconto do cliente</li>
              <li>• Digite o CPF com ou sem pontos e traços</li>
              <li>• O valor deve incluir centavos (ex: 25,50)</li>
              <li>• Você não pode usar seu próprio CPF</li>
              <li>• O cashback será creditado automaticamente para o cliente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
