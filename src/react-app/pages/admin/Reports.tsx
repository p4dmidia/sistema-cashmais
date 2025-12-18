import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  LayoutDashboard,
  Shield,
  Users,
  Building2,
  CreditCard,
  Settings,
  Calendar,
  FileDown,
  Printer,
  CheckSquare
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CompanyOption { id: number; nome_fantasia: string }
interface PurchaseRow {
  id: number;
  company_id: number;
  purchase_value: number;
  cashback_generated: number;
  purchase_date: string;
  customer_coupon: string | null;
  companies?: { nome_fantasia: string };
}

interface Pagination { page: number; limit: number; total: number; totalPages: number }

export default function Reports() {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyId, setCompanyId] = useState<string>('');
  const [range, setRange] = useState<string>('7');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  useEffect(() => { fetchCompanies(); }, []);
  useEffect(() => { fetchPurchases(); }, [companyId, range, customStart, customEnd, pagination.page]);

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/admin/reports/companies', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } catch (e) {
      console.error('Failed to load companies', e);
    }
  };

  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        range,
      });
      if (companyId) params.set('companyId', companyId);
      if (range === 'custom' && customStart && customEnd) {
        params.set('start', customStart);
        params.set('end', customEnd);
      }
      const res = await fetch(`/api/admin/reports/purchases?${params.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPurchases(data.purchases || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      }
    } catch (e) {
      console.error('Failed to load purchases', e);
    } finally {
      setIsLoading(false);
    }
  };

  const totals = useMemo(() => {
    const totalPurchase = purchases.reduce((sum, r) => sum + Number(r.purchase_value || 0), 0);
    const totalCashback = purchases.reduce((sum, r) => sum + Number(r.cashback_generated || 0), 0);
    return { totalPurchase, totalCashback };
  }, [purchases]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR');

  const toggleSelect = (id: number) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  const clearSelection = () => setSelected({});

  const selectedRows = useMemo(() => purchases.filter(p => selected[p.id]), [purchases, selected]);
  const groupedByCompany = useMemo(() => {
    const map: Record<number, PurchaseRow[]> = {};
    for (const row of selectedRows) {
      const key = row.company_id;
      if (!map[key]) map[key] = [];
      map[key].push(row);
    }
    return map;
  }, [selectedRows]);
  const totalsByCompany = useMemo(() => {
    const res: Record<number, number> = {};
    for (const [cidStr, rows] of Object.entries(groupedByCompany)) {
      const cid = Number(cidStr);
      res[cid] = rows.reduce((sum, r) => sum + Number(r.cashback_generated || 0), 0);
    }
    return res;
  }, [groupedByCompany]);

  const [showModal, setShowModal] = useState(false);
  const [modalCompanyId, setModalCompanyId] = useState<number | null>(null);
  const [modalDueDate, setModalDueDate] = useState<string>('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [boletoLink, setBoletoLink] = useState<string | null>(null);

  const openGenerateModal = (company_id: number) => {
    setModalCompanyId(company_id);
    setModalDueDate('');
    setModalMessage(null);
    setBoletoLink(null);
    setShowModal(true);
  };

  const submitGenerateInvoice = async () => {
    if (!modalCompanyId || !modalDueDate) {
      setModalMessage('Informe a data de vencimento');
      return;
    }
    const amount = totalsByCompany[modalCompanyId] || 0;
    if (amount <= 0) {
      setModalMessage('Selecione registros dessa empresa para somar o valor');
      return;
    }
    setModalLoading(true);
    try {
      const res = await fetch('/api/admin/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ company_id: modalCompanyId, amount, due_date: modalDueDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setModalMessage(data.error || 'Erro ao gerar boleto');
        setBoletoLink(null);
      } else {
        setModalMessage('Boleto Gerado!');
        setBoletoLink(data.boleto_link || null);
      }
    } catch (e) {
      setModalMessage('Erro de conexão');
      setBoletoLink(null);
    } finally {
      setModalLoading(false);
    }
  };

  const generateReportPDF = () => {
    const doc = new jsPDF('p', 'pt');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Cash Mais - Relatório de Vendas', 40, 40);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    const subtitle = `Filtro: ${companyId ? 'Empresa ' + (companies.find(c => c.id === Number(companyId))?.nome_fantasia || companyId) : 'Todas'} | Intervalo: ${range}`;
    doc.text(subtitle, 40, 62);
    doc.text(`Total Compras: ${formatCurrency(totals.totalPurchase)} | Total Cashback: ${formatCurrency(totals.totalCashback)}`, 40, 80);

    const rows = purchases.map(r => [
      r.companies?.nome_fantasia || r.company_id,
      formatDate(r.purchase_date),
      formatCurrency(Number(r.purchase_value || 0)),
      formatCurrency(Number(r.cashback_generated || 0)),
      r.customer_coupon || '-'
    ]);
    autoTable(doc, {
      head: [['Empresa', 'Data', 'Valor', 'Cashback', 'Cupom']],
      body: rows,
      startY: 100,
      styles: { font: 'Helvetica', fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [0, 64, 128], textColor: 255 },
      theme: 'grid'
    });

    doc.setDrawColor(0, 160, 80);
    doc.setLineWidth(1);
    doc.line(40, doc.internal.pageSize.getHeight() - 60, doc.internal.pageSize.getWidth() - 40, doc.internal.pageSize.getHeight() - 60);
    doc.setFontSize(9);
    doc.text('Cash Mais • Relatório gerado automaticamente', 40, doc.internal.pageSize.getHeight() - 40);

    doc.save('relatorio-cashmais.pdf');
  };

  const generateBoletosPDF = () => {
    if (selectedRows.length === 0) {
      alert('Selecione ao menos um item para emitir boleto');
      return;
    }

    const doc = new jsPDF('p', 'pt');
    let y = 40;
    for (const [compIdStr, rows] of Object.entries(groupedByCompany)) {
      const compId = Number(compIdStr);
      const companyName = companies.find(c => c.id === compId)?.nome_fantasia || String(compId);
      const total = rows.reduce((sum, r) => sum + Number(r.cashback_generated || 0), 0);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(`Cash Mais - Boleto de Cobrança`, 40, y); y += 24;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Empresa: ${companyName}`, 40, y); y += 18;
      doc.text(`Referência: Cashbacks selecionados`, 40, y); y += 18;
      doc.text(`Valor: ${formatCurrency(total)}`, 40, y); y += 18;
      doc.text(`Vencimento: ${new Date().toLocaleDateString('pt-BR')}`, 40, y); y += 18;
      doc.text(`Observação: Pagamento referente a cashbacks gerados.`, 40, y); y += 24;

      autoTable(doc, {
        head: [['Data', 'Valor da Compra', 'Cashback', 'Cupom']],
        body: rows.map(r => [
          formatDate(r.purchase_date),
          formatCurrency(Number(r.purchase_value || 0)),
          formatCurrency(Number(r.cashback_generated || 0)),
          r.customer_coupon || '-'
        ]),
        startY: y,
        styles: { font: 'Helvetica', fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [0, 64, 128], textColor: 255 },
        theme: 'grid'
      });
      y = (doc as any).lastAutoTable.finalY + 30;

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(40, y, doc.internal.pageSize.getWidth() - 80, 60); y += 80;

      if (y > doc.internal.pageSize.getHeight() - 100) {
        doc.addPage();
        y = 40;
      }
    }

    doc.save('boletos-cashmais.pdf');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001144] to-[#000011]">
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-black/20 backdrop-blur-xl border-r border-white/10">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-center border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-green-400" />
              <span className="text-xl font-bold text-white">Admin</span>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            <Link to="/admin/dashboard" className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-white/5 hover:text-white">
              <LayoutDashboard className="mr-3 h-5 w-5 text-gray-400" />
              Dashboard
            </Link>
            <Link to="/admin/withdrawals" className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-white/5 hover:text-white">
              <CreditCard className="mr-3 h-5 w-5 text-gray-400" />
              Saques
            </Link>
            <Link to="/admin/affiliates" className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-white/5 hover:text-white">
              <Users className="mr-3 h-5 w-5 text-gray-400" />
              Afiliados
            </Link>
            <Link to="/admin/companies" className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-white/5 hover:text-white">
              <Building2 className="mr-3 h-5 w-5 text-gray-400" />
              Empresas
            </Link>
            <Link to="/admin/reports" className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20">
              <Printer className="mr-3 h-5 w-5 text-green-400" />
              Relatórios
            </Link>
            <Link to="/admin/settings" className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-white/5 hover:text-white">
              <Settings className="mr-3 h-5 w-5 text-gray-400" />
              Configurações
            </Link>
          </nav>
        </div>
      </div>

      <div className="pl-64">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Relatórios de Vendas</h1>
            <p className="text-gray-400">Visualize vendas e cashbacks com filtros e emissão de PDFs</p>
          </div>

          <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Empresa</label>
                <select value={companyId} onChange={e => { setCompanyId(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full bg-black/20 border border-white/10 rounded-lg text-white px-3 py-2">
                  <option value="">Todas</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.nome_fantasia}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Período</label>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <select value={range} onChange={e => { setRange(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="flex-1 bg-black/20 border border-white/10 rounded-lg text-white px-3 py-2">
                    <option value="today">Hoje</option>
                    <option value="yesterday">Ontem</option>
                    <option value="7">Últimos 7 dias</option>
                    <option value="15">Últimos 15 dias</option>
                    <option value="30">Últimos 30 dias</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
              </div>
              {range === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Início</label>
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg text-white px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Fim</label>
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg text-white px-3 py-2" />
                  </div>
                </>
              )}
              <div className="flex items-center space-x-2 justify-end">
                <button onClick={generateReportPDF} className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200">
                  <FileDown className="h-4 w-4 inline mr-2" /> Exportar PDF
                </button>
                <button onClick={generateBoletosPDF} className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200">
                  <Printer className="h-4 w-4 inline mr-2" /> Emitir Boletos
                </button>
              </div>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Resultados</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <span>Total: {pagination.total}</span>
                <span>Compras: {formatCurrency(totals.totalPurchase)}</span>
                <span>Cashback: {formatCurrency(totals.totalCashback)}</span>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
              </div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-8 text-gray-400">Nenhum registro encontrado</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-sm font-medium text-gray-400 pb-3">Seleção</th>
                        <th className="text-left text-sm font-medium text-gray-400 pb-3">Empresa</th>
                        <th className="text-left text-sm font-medium text-gray-400 pb-3">Data</th>
                        <th className="text-left text-sm font-medium text-gray-400 pb-3">Valor</th>
                        <th className="text-left text-sm font-medium text-gray-400 pb-3">Cashback</th>
                        <th className="text-left text-sm font-medium text-gray-400 pb-3">Cupom</th>
                        <th className="text-left text-sm font-medium text-gray-400 pb-3">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map(row => (
                        <tr key={row.id} className="border-b border-white/5">
                          <td className="py-3">
                            <button onClick={() => toggleSelect(row.id)} className={`border px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${selected[row.id] ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}>
                              <CheckSquare className="h-3 w-3" />
                            </button>
                          </td>
                          <td className="py-3 text-sm text-white">{row.companies?.nome_fantasia || row.company_id}</td>
                          <td className="py-3 text-sm text-gray-300">{formatDate(row.purchase_date)}</td>
                          <td className="py-3 text-sm text-white font-medium">{formatCurrency(Number(row.purchase_value || 0))}</td>
                          <td className="py-3 text-sm text-green-400 font-medium">{formatCurrency(Number(row.cashback_generated || 0))}</td>
                          <td className="py-3 text-sm text-gray-300 font-mono">{row.customer_coupon || '-'}</td>
                          <td className="py-3 text-sm">
                            <button
                              onClick={() => openGenerateModal(row.company_id)}
                              disabled={!totalsByCompany[row.company_id] || (totalsByCompany[row.company_id] || 0) <= 0}
                              className="border px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Gerar Boleto
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
                    <div className="text-sm text-gray-400">Página {pagination.page} de {pagination.totalPages}</div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1} className="bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">Anterior</button>
                      <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page === pagination.totalPages} className="bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">Próxima</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedRows.length > 0 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-400">Selecionados: {selectedRows.length} | Empresas: {Object.keys(groupedByCompany).length}</div>
                <button onClick={clearSelection} className="bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg text-sm">Limpar seleção</button>
              </div>
            )}
          </div>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="bg-black/80 border border-white/10 rounded-xl p-6 w-full max-w-md">
                <h3 className="text-white text-lg font-semibold mb-4">Gerar Boleto</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Empresa: {companies.find(c => c.id === modalCompanyId!)?.nome_fantasia || modalCompanyId}
                </p>
                <p className="text-gray-300 text-sm mb-4">
                  Valor selecionado: {formatCurrency(totalsByCompany[modalCompanyId! || 0] || 0)}
                </p>
                <label className="block text-sm text-gray-400 mb-2">Vencimento</label>
                <input
                  type="date"
                  value={modalDueDate}
                  onChange={e => setModalDueDate(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg text-white px-3 py-2 mb-4"
                />
                {modalMessage && <div className="text-sm mb-3 text-gray-200">{modalMessage}</div>}
                {boletoLink && (
                  <a href={boletoLink} target="_blank" rel="noreferrer" className="inline-block bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-2 rounded-lg text-sm mr-2">
                    Visualizar Boleto
                  </a>
                )}
                <div className="flex items-center justify-end space-x-2">
                  <button onClick={() => setShowModal(false)} className="bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg text-sm">Cancelar</button>
                  <button onClick={submitGenerateInvoice} disabled={modalLoading} className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    {modalLoading ? 'Gerando...' : 'Gerar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
