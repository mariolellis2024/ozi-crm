import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { FileSignature, CheckCircle, XCircle, Clock, Copy, ExternalLink, Loader2, Search, Users, AlertTriangle, RefreshCw, DollarSign, UserCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { formatPhone } from '../utils/format';
import { useUnidade } from '../contexts/UnidadeContext';

interface ContractOverview {
  aluno_id: string;
  aluno_nome: string;
  aluno_whatsapp: string;
  aluno_email: string | null;
  aluno_cpf: string | null;
  aluno_rg: string | null;
  aluno_endereco: string | null;
  aluno_cidade: string | null;
  aluno_uf: string | null;
  aluno_profissao: string | null;
  aluno_nascimento: string | null;
  aluno_cep: string | null;
  turma_id: string;
  turma_nome: string;
  curso_nome: string;
  curso_preco: number;
  contrato_id: string | null;
  contrato_status: string | null;
  sign_url: string | null;
  contrato_created_at: string | null;
  signed_at: string | null;
  zapsign_doc_token: string | null;
}

type StatusFilter = 'all' | 'none' | 'pending' | 'signed' | 'overdue' | 'incomplete';

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  none: { label: 'Sem contrato', icon: FileSignature, color: 'text-gray-400', bg: 'bg-gray-500/10' },
  incomplete: { label: 'Dados incompletos', icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  pending: { label: 'Pendente', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  signed: { label: 'Assinado', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  refused: { label: 'Recusado', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  expired: { label: 'Expirado', icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-500/10' },
};

const REQUIRED_FIELDS: { key: keyof ContractOverview; label: string }[] = [
  { key: 'aluno_cpf', label: 'CPF' },
  { key: 'aluno_rg', label: 'RG' },
  { key: 'aluno_endereco', label: 'Endereço' },
  { key: 'aluno_cidade', label: 'Cidade' },
  { key: 'aluno_uf', label: 'UF' },
  { key: 'aluno_profissao', label: 'Profissão' },
  { key: 'aluno_nascimento', label: 'Data de Nascimento' },
  { key: 'aluno_cep', label: 'CEP' },
];

function getMissingFields(item: ContractOverview): string[] {
  return REQUIRED_FIELDS.filter(f => !item[f.key]).map(f => f.label);
}

function isDataComplete(item: ContractOverview): boolean {
  return getMissingFields(item).length === 0;
}

export function Contratos() {
  const { selectedUnidadeId } = useUnidade();
  const [data, setData] = useState<ContractOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [generatingContract, setGeneratingContract] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);

  // Data collection form (step 1)
  const [dataForm, setDataForm] = useState<{
    isOpen: boolean;
    alunoId: string;
    alunoNome: string;
    turmaId: string;
    cpf: string;
    rg: string;
    endereco: string;
    cidade: string;
    uf: string;
    profissao: string;
    data_nascimento: string;
    cep: string;
    saving: boolean;
  }>({
    isOpen: false, alunoId: '', alunoNome: '', turmaId: '',
    cpf: '', rg: '', endereco: '', cidade: '', uf: '', profissao: '', data_nascimento: '', cep: '',
    saving: false
  });

  // Payment form (step 2)
  const [paymentForm, setPaymentForm] = useState<{
    isOpen: boolean;
    alunoId: string;
    alunoNome: string;
    turmaId: string;
    cursoPreco: number;
    taxa_reserva: string;
    saldo_pix: string;
    parcelas_cartao: string;
    valor_parcela: string;
  }>({
    isOpen: false, alunoId: '', alunoNome: '', turmaId: '', cursoPreco: 0,
    taxa_reserva: '', saldo_pix: '', parcelas_cartao: '', valor_parcela: ''
  });

  const loadData = useCallback(async () => {
    try {
      const params = selectedUnidadeId ? `?unidade_id=${selectedUnidadeId}` : '';
      const result = await api.get(`/api/contratos/overview${params}`);
      setData(result.map((r: any) => ({ ...r, curso_preco: parseFloat(r.curso_preco) || 0 })));
    } catch (error: any) {
      toast.error('Erro ao carregar contratos');
    } finally {
      setLoading(false);
    }
  }, [selectedUnidadeId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  function isOverdue(item: ContractOverview): boolean {
    if (item.contrato_status !== 'pending' || !item.contrato_created_at) return false;
    return (Date.now() - new Date(item.contrato_created_at).getTime()) > 24 * 60 * 60 * 1000;
  }

  function getEffectiveStatus(item: ContractOverview): string {
    if (item.contrato_id) return item.contrato_status || 'pending';
    if (!isDataComplete(item)) return 'incomplete';
    return 'none';
  }

  const filtered = data.filter(item => {
    const matchesSearch =
      item.aluno_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.turma_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.curso_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.aluno_whatsapp || '').includes(searchTerm);
    if (!matchesSearch) return false;
    const status = getEffectiveStatus(item);
    if (statusFilter === 'all') return true;
    if (statusFilter === 'overdue') return isOverdue(item);
    return status === statusFilter;
  });

  const groupedByTurma = filtered.reduce((acc, item) => {
    if (!acc[item.turma_id]) {
      acc[item.turma_id] = { turma_nome: item.turma_nome, curso_nome: item.curso_nome, items: [] };
    }
    acc[item.turma_id].items.push(item);
    return acc;
  }, {} as Record<string, { turma_nome: string; curso_nome: string; items: ContractOverview[] }>);

  const total = data.length;
  const incomplete = data.filter(i => !i.contrato_id && !isDataComplete(i)).length;
  const semContrato = data.filter(i => !i.contrato_id && isDataComplete(i)).length;
  const pendentes = data.filter(i => i.contrato_status === 'pending').length;
  const assinados = data.filter(i => i.contrato_status === 'signed').length;
  const atrasados = data.filter(i => isOverdue(i)).length;

  function handleContractClick(item: ContractOverview) {
    if (!isDataComplete(item)) {
      // Step 1: collect missing data
      setDataForm({
        isOpen: true,
        alunoId: item.aluno_id,
        alunoNome: item.aluno_nome,
        turmaId: item.turma_id,
        cpf: item.aluno_cpf || '',
        rg: item.aluno_rg || '',
        endereco: item.aluno_endereco || '',
        cidade: item.aluno_cidade || '',
        uf: item.aluno_uf || '',
        profissao: item.aluno_profissao || '',
        data_nascimento: item.aluno_nascimento ? item.aluno_nascimento.split('T')[0] : '',
        cep: item.aluno_cep || '',
        saving: false
      });
    } else {
      // Step 2: payment data
      openPaymentForm(item);
    }
  }

  function openPaymentForm(item: ContractOverview) {
    setPaymentForm({
      isOpen: true,
      alunoId: item.aluno_id,
      alunoNome: item.aluno_nome,
      turmaId: item.turma_id,
      cursoPreco: item.curso_preco,
      taxa_reserva: '',
      saldo_pix: '',
      parcelas_cartao: '',
      valor_parcela: ''
    });
  }

  async function handleSaveData() {
    setDataForm(prev => ({ ...prev, saving: true }));
    try {
      // Check required fields
      const { cpf, rg, endereco, cidade, uf, profissao } = dataForm;
      if (!cpf || !rg || !endereco || !cidade || !uf || !profissao) {
        toast.error('Preencha todos os campos obrigatórios');
        setDataForm(prev => ({ ...prev, saving: false }));
        return;
      }

      await api.patch(`/api/alunos/${dataForm.alunoId}`, {
        cpf: dataForm.cpf,
        rg: dataForm.rg,
        endereco: dataForm.endereco,
        cidade: dataForm.cidade,
        uf: dataForm.uf,
        profissao: dataForm.profissao,
        data_nascimento: dataForm.data_nascimento || null,
        cep: dataForm.cep || null
      });

      toast.success('Dados salvos! Agora preencha os valores do pagamento.');
      setDataForm(prev => ({ ...prev, isOpen: false, saving: false }));

      // Reload data to get updated student info
      await loadData();

      // Find updated item and open payment form
      const updatedData = await api.get(`/api/contratos/overview${selectedUnidadeId ? `?unidade_id=${selectedUnidadeId}` : ''}`);
      const updatedItem = updatedData.find((i: any) => i.aluno_id === dataForm.alunoId && i.turma_id === dataForm.turmaId);
      if (updatedItem) {
        openPaymentForm({ ...updatedItem, curso_preco: parseFloat(updatedItem.curso_preco) || 0 });
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar dados');
      setDataForm(prev => ({ ...prev, saving: false }));
    }
  }

  function handleTaxaReservaChange(value: string) {
    const taxa = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const saldo = paymentForm.cursoPreco - taxa;
    setPaymentForm(prev => ({
      ...prev,
      taxa_reserva: value,
      saldo_pix: saldo > 0 ? `R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''
    }));
  }

  async function handleGenerateContract() {
    const { alunoId, turmaId, taxa_reserva, saldo_pix, parcelas_cartao, valor_parcela } = paymentForm;
    const key = `${alunoId}-${turmaId}`;
    setGeneratingContract(key);
    setPaymentForm(prev => ({ ...prev, isOpen: false }));
    try {
      const contrato = await api.post('/api/contratos/generate', {
        aluno_id: alunoId,
        turma_id: turmaId,
        taxa_reserva: taxa_reserva || undefined,
        saldo_pix: saldo_pix || undefined,
        parcelas_cartao: parcelas_cartao || undefined,
        valor_parcela: valor_parcela || undefined
      });
      if (contrato.sign_url) {
        await navigator.clipboard.writeText(contrato.sign_url);
        toast.success('Contrato gerado! Link copiado.');
      } else {
        toast.success('Contrato gerado!');
      }
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar contrato');
    } finally {
      setGeneratingContract(null);
    }
  }

  function handleCopyLink(url: string) {
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  }

  async function handleRefreshAll() {
    setRefreshingAll(true);
    try {
      const pending = data.filter(i => i.contrato_id && i.contrato_status === 'pending');
      for (const item of pending) {
        try { await api.post(`/api/contratos/${item.contrato_id}/refresh`, {}); } catch {}
      }
      await loadData();
      toast.success('Status atualizado!');
    } catch { toast.error('Erro ao atualizar status'); }
    finally { setRefreshingAll(false); }
  }

  function formatTimeAgo(dateStr: string): string {
    const hours = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Agora';
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 fade-in-delay-1">
          <div className="slide-in-left">
            <h1 className="text-3xl font-bold text-white">Contratos</h1>
            <p className="text-gray-400 mt-2">Gerencie os contratos dos alunos matriculados</p>
          </div>
          <button onClick={handleRefreshAll} disabled={refreshingAll}
            className="flex items-center px-4 py-2 bg-dark-card border border-gray-700 text-gray-300 rounded-lg hover:bg-dark-lighter hover:text-white transition-colors disabled:opacity-50 slide-in-right">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshingAll ? 'animate-spin' : ''}`} />
            {refreshingAll ? 'Atualizando...' : 'Atualizar Status'}
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8 scale-in">
          {[
            { key: 'all' as StatusFilter, label: 'Total', value: total, color: 'text-white', ring: 'ring-teal-accent' },
            { key: 'incomplete' as StatusFilter, label: 'Dados Incompletos', value: incomplete, color: 'text-orange-400', ring: 'ring-orange-400' },
            { key: 'none' as StatusFilter, label: 'Prontos', value: semContrato, color: 'text-blue-400', ring: 'ring-blue-400' },
            { key: 'pending' as StatusFilter, label: 'Pendentes', value: pendentes, color: 'text-amber-400', ring: 'ring-amber-400' },
            { key: 'signed' as StatusFilter, label: 'Assinados', value: assinados, color: 'text-emerald-400', ring: 'ring-emerald-400' },
            { key: 'overdue' as StatusFilter, label: 'Atrasados 24h+', value: atrasados, color: 'text-red-400', ring: 'ring-red-400' },
          ].map(m => (
            <button key={m.key} onClick={() => setStatusFilter(m.key)}
              className={`bg-dark-card rounded-xl p-4 text-left transition-all hover-lift ${statusFilter === m.key ? `ring-2 ${m.ring}` : ''}`}>
              <p className={`${m.color} text-xs mb-1`}>{m.label}</p>
              <p className={`text-2xl font-bold ${m.color} ${m.key === 'overdue' && m.value > 0 ? 'animate-pulse' : ''}`}>{m.value}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Buscar por aluno, turma ou curso..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-accent" />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-accent border-t-transparent"></div>
          </div>
        ) : Object.keys(groupedByTurma).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedByTurma).map(([turmaId, group]) => (
              <div key={turmaId} className="bg-dark-card rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white text-lg">{group.turma_nome}</h3>
                    <p className="text-gray-400 text-sm">{group.curso_nome}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Users className="h-4 w-4" />
                    {group.items.length} aluno{group.items.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="divide-y divide-gray-700/30">
                  {group.items.map((item) => {
                    const status = getEffectiveStatus(item);
                    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.none;
                    const StatusIcon = cfg.icon;
                    const overdue = isOverdue(item);
                    const missing = getMissingFields(item);
                    const key = `${item.aluno_id}-${item.turma_id}`;

                    return (
                      <div key={key}
                        className={`px-6 py-4 flex items-center justify-between hover:bg-dark-lighter/50 transition-colors ${overdue ? 'bg-red-500/5' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-white truncate">{item.aluno_nome}</span>
                            {overdue && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 animate-pulse">
                                <AlertTriangle className="h-3 w-3" />24h+
                              </span>
                            )}
                            {status === 'incomplete' && (
                              <span className="text-[10px] text-orange-400/80" title={`Faltam: ${missing.join(', ')}`}>
                                falta: {missing.slice(0, 3).join(', ')}{missing.length > 3 ? '...' : ''}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                            <a href={`https://wa.me/${(item.aluno_whatsapp || '').replace(/\D/g, '')}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-green-400 hover:text-green-300 transition-colors">
                              📱 {formatPhone(item.aluno_whatsapp || '')}
                            </a>
                            {item.aluno_email && <span>📧 {item.aluno_email}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 ml-4">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${cfg.bg} ${overdue ? 'animate-pulse' : ''}`}>
                            <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
                            <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                            {item.contrato_created_at && status === 'pending' && (
                              <span className="text-[10px] text-gray-500 ml-1">{formatTimeAgo(item.contrato_created_at)}</span>
                            )}
                          </div>

                          {/* Actions based on status */}
                          {(status === 'none' || status === 'incomplete') ? (
                            <button onClick={() => handleContractClick(item)}
                              disabled={generatingContract === key}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                                status === 'incomplete'
                                  ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                                  : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                              }`}>
                              {generatingContract === key ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : status === 'incomplete' ? (
                                <AlertCircle className="h-3.5 w-3.5" />
                              ) : (
                                <FileSignature className="h-3.5 w-3.5" />
                              )}
                              <span>{generatingContract === key ? 'Gerando...' : status === 'incomplete' ? 'Completar Dados' : 'Gerar Contrato'}</span>
                            </button>
                          ) : item.sign_url && status === 'pending' ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleCopyLink(item.sign_url!)}
                                className="p-2 text-gray-400 hover:text-teal-accent transition-colors rounded-lg hover:bg-teal-accent/10" title="Copiar link">
                                <Copy className="h-4 w-4" />
                              </button>
                              <a href={item.sign_url} target="_blank" rel="noopener noreferrer"
                                className="p-2 text-gray-400 hover:text-teal-accent transition-colors rounded-lg hover:bg-teal-accent/10" title="Abrir">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          ) : item.signed_at ? (
                            <span className="text-[10px] text-emerald-400/70">{new Date(item.signed_at).toLocaleDateString('pt-BR')}</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <FileSignature className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p className="text-lg">
              {searchTerm || statusFilter !== 'all'
                ? 'Nenhum resultado encontrado com os filtros aplicados'
                : 'Nenhum aluno matriculado para gerar contratos'}
            </p>
          </div>
        )}
      </div>

      {/* STEP 1: Data Collection Modal */}
      {dataForm.isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={() => setDataForm(prev => ({ ...prev, isOpen: false }))}>
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-2">
              <UserCheck className="h-6 w-6 text-orange-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Dados para o Contrato</h3>
                <p className="text-sm text-gray-400">{dataForm.alunoNome}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4">Complete os dados obrigatórios (*) do aluno para gerar o contrato.</p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">CPF *</label>
                  <input type="text" value={dataForm.cpf} onChange={e => setDataForm(prev => ({ ...prev, cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">RG *</label>
                  <input type="text" value={dataForm.rg} onChange={e => setDataForm(prev => ({ ...prev, rg: e.target.value }))}
                    placeholder="00.000.000-0"
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Endereço Completo *</label>
                <input type="text" value={dataForm.endereco} onChange={e => setDataForm(prev => ({ ...prev, endereco: e.target.value }))}
                  placeholder="Rua, número, complemento, bairro"
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Cidade *</label>
                  <input type="text" value={dataForm.cidade} onChange={e => setDataForm(prev => ({ ...prev, cidade: e.target.value }))}
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">UF *</label>
                  <input type="text" value={dataForm.uf} onChange={e => setDataForm(prev => ({ ...prev, uf: e.target.value }))}
                    maxLength={2} placeholder="SP"
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">CEP</label>
                  <input type="text" value={dataForm.cep} onChange={e => setDataForm(prev => ({ ...prev, cep: e.target.value }))}
                    placeholder="00000-000"
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Profissão *</label>
                  <input type="text" value={dataForm.profissao} onChange={e => setDataForm(prev => ({ ...prev, profissao: e.target.value }))}
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Data de Nascimento</label>
                  <input type="date" value={dataForm.data_nascimento} onChange={e => setDataForm(prev => ({ ...prev, data_nascimento: e.target.value }))}
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setDataForm(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-dark-lighter text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors text-sm">
                Cancelar
              </button>
              <button onClick={handleSaveData} disabled={dataForm.saving}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm flex items-center gap-2 disabled:opacity-50">
                {dataForm.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                {dataForm.saving ? 'Salvando...' : 'Salvar e Continuar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* STEP 2: Payment Modal */}
      {paymentForm.isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={() => setPaymentForm(prev => ({ ...prev, isOpen: false }))}>
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-6 w-6 text-purple-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Valores do Contrato</h3>
                <p className="text-sm text-gray-400">{paymentForm.alunoNome}</p>
              </div>
            </div>

            <div className="bg-dark-lighter rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-gray-400">Valor do Curso</span>
              <span className="text-lg font-bold text-teal-accent">
                R$ {paymentForm.cursoPreco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Taxa de Reserva</label>
                <input type="text" value={paymentForm.taxa_reserva}
                  onChange={e => handleTaxaReservaChange(e.target.value)}
                  placeholder="Ex: R$ 500,00"
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Saldo via PIX
                  <span className="text-[10px] text-gray-500 ml-2">(calculado automaticamente)</span>
                </label>
                <input type="text" value={paymentForm.saldo_pix} readOnly
                  className="w-full bg-dark-lighter/50 border border-gray-700 rounded-lg px-4 py-2 text-emerald-400 font-medium focus:outline-none text-sm cursor-default" />
              </div>
              <div className="border-t border-gray-700 pt-3">
                <p className="text-xs text-gray-500 mb-2">Ou pagamento via cartão de crédito (preencher manualmente):</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Parcelas</label>
                    <input type="text" value={paymentForm.parcelas_cartao}
                      onChange={e => setPaymentForm(prev => ({ ...prev, parcelas_cartao: e.target.value }))}
                      placeholder="Ex: 12x"
                      className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Valor da Parcela</label>
                    <input type="text" value={paymentForm.valor_parcela}
                      onChange={e => setPaymentForm(prev => ({ ...prev, valor_parcela: e.target.value }))}
                      placeholder="Ex: R$ 250,00"
                      className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setPaymentForm(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-dark-lighter text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors text-sm">
                Cancelar
              </button>
              <button onClick={handleGenerateContract}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm flex items-center gap-2">
                <FileSignature className="h-4 w-4" />
                Gerar Contrato
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
