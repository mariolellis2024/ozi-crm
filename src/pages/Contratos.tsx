import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { FileSignature, CheckCircle, XCircle, Clock, Copy, ExternalLink, Loader2, Search, Users, AlertTriangle, RefreshCw, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { formatPhone } from '../utils/format';
import { useUnidade } from '../contexts/UnidadeContext';

interface ContractOverview {
  aluno_id: string;
  aluno_nome: string;
  aluno_whatsapp: string;
  aluno_email: string | null;
  turma_id: string;
  turma_nome: string;
  curso_nome: string;
  contrato_id: string | null;
  contrato_status: string | null;
  sign_url: string | null;
  contrato_created_at: string | null;
  signed_at: string | null;
  zapsign_doc_token: string | null;
}

type StatusFilter = 'all' | 'none' | 'pending' | 'signed' | 'overdue';

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  none: { label: 'Sem contrato', icon: FileSignature, color: 'text-gray-400', bg: 'bg-gray-500/10' },
  pending: { label: 'Pendente', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  signed: { label: 'Assinado', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  refused: { label: 'Recusado', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  expired: { label: 'Expirado', icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-500/10' },
};

export function Contratos() {
  const { selectedUnidadeId } = useUnidade();
  const [data, setData] = useState<ContractOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [generatingContract, setGeneratingContract] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [contractForm, setContractForm] = useState<{
    isOpen: boolean;
    alunoId: string;
    alunoNome: string;
    turmaId: string;
    taxa_reserva: string;
    saldo_pix: string;
    parcelas_cartao: string;
    valor_parcela: string;
  }>({
    isOpen: false,
    alunoId: '',
    alunoNome: '',
    turmaId: '',
    taxa_reserva: '',
    saldo_pix: '',
    parcelas_cartao: '',
    valor_parcela: ''
  });

  const loadData = useCallback(async () => {
    try {
      const params = selectedUnidadeId ? `?unidade_id=${selectedUnidadeId}` : '';
      const result = await api.get(`/api/contratos/overview${params}`);
      setData(result);
    } catch (error: any) {
      toast.error('Erro ao carregar contratos');
    } finally {
      setLoading(false);
    }
  }, [selectedUnidadeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  function isOverdue(item: ContractOverview): boolean {
    if (item.contrato_status !== 'pending' || !item.contrato_created_at) return false;
    const created = new Date(item.contrato_created_at);
    const now = new Date();
    return (now.getTime() - created.getTime()) > 24 * 60 * 60 * 1000;
  }

  function getEffectiveStatus(item: ContractOverview): string {
    if (!item.contrato_id) return 'none';
    return item.contrato_status || 'pending';
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
    if (statusFilter === 'none') return status === 'none';
    return status === statusFilter;
  });

  // Group by turma
  const groupedByTurma = filtered.reduce((acc, item) => {
    if (!acc[item.turma_id]) {
      acc[item.turma_id] = { turma_nome: item.turma_nome, curso_nome: item.curso_nome, items: [] };
    }
    acc[item.turma_id].items.push(item);
    return acc;
  }, {} as Record<string, { turma_nome: string; curso_nome: string; items: ContractOverview[] }>);

  // Stats
  const total = data.length;
  const semContrato = data.filter(i => !i.contrato_id).length;
  const pendentes = data.filter(i => i.contrato_status === 'pending').length;
  const assinados = data.filter(i => i.contrato_status === 'signed').length;
  const atrasados = data.filter(i => isOverdue(i)).length;

  function handleOpenContractForm(item: ContractOverview) {
    setContractForm({
      isOpen: true,
      alunoId: item.aluno_id,
      alunoNome: item.aluno_nome,
      turmaId: item.turma_id,
      taxa_reserva: '',
      saldo_pix: '',
      parcelas_cartao: '',
      valor_parcela: ''
    });
  }

  async function handleGenerateContract() {
    const { alunoId, turmaId, taxa_reserva, saldo_pix, parcelas_cartao, valor_parcela } = contractForm;
    const key = `${alunoId}-${turmaId}`;
    setGeneratingContract(key);
    setContractForm(prev => ({ ...prev, isOpen: false }));
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
        toast.success('Contrato gerado! Link copiado para a área de transferência.');
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
      const pendingContracts = data.filter(i => i.contrato_id && i.contrato_status === 'pending');
      for (const item of pendingContracts) {
        try {
          await api.post(`/api/contratos/${item.contrato_id}/refresh`, {});
        } catch {}
      }
      await loadData();
      toast.success('Status atualizado!');
    } catch {
      toast.error('Erro ao atualizar status');
    } finally {
      setRefreshingAll(false);
    }
  }

  function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Agora há pouco';
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  }

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 fade-in-delay-1">
          <div className="slide-in-left">
            <h1 className="text-3xl font-bold text-white">Contratos</h1>
            <p className="text-gray-400 mt-2">Gerencie os contratos dos alunos matriculados</p>
          </div>
          <button
            onClick={handleRefreshAll}
            disabled={refreshingAll}
            className="flex items-center px-4 py-2 bg-dark-card border border-gray-700 text-gray-300 rounded-lg hover:bg-dark-lighter hover:text-white transition-colors disabled:opacity-50 slide-in-right"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshingAll ? 'animate-spin' : ''}`} />
            {refreshingAll ? 'Atualizando...' : 'Atualizar Status'}
          </button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 scale-in">
          <button
            onClick={() => setStatusFilter('all')}
            className={`bg-dark-card rounded-xl p-4 text-left transition-all hover-lift ${statusFilter === 'all' ? 'ring-2 ring-teal-accent' : ''}`}
          >
            <p className="text-gray-400 text-xs mb-1">Total</p>
            <p className="text-2xl font-bold text-white">{total}</p>
          </button>
          <button
            onClick={() => setStatusFilter('none')}
            className={`bg-dark-card rounded-xl p-4 text-left transition-all hover-lift ${statusFilter === 'none' ? 'ring-2 ring-gray-400' : ''}`}
          >
            <p className="text-gray-400 text-xs mb-1">Sem Contrato</p>
            <p className="text-2xl font-bold text-gray-300">{semContrato}</p>
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`bg-dark-card rounded-xl p-4 text-left transition-all hover-lift ${statusFilter === 'pending' ? 'ring-2 ring-amber-400' : ''}`}
          >
            <p className="text-amber-400 text-xs mb-1">Pendentes</p>
            <p className="text-2xl font-bold text-amber-400">{pendentes}</p>
          </button>
          <button
            onClick={() => setStatusFilter('signed')}
            className={`bg-dark-card rounded-xl p-4 text-left transition-all hover-lift ${statusFilter === 'signed' ? 'ring-2 ring-emerald-400' : ''}`}
          >
            <p className="text-emerald-400 text-xs mb-1">Assinados</p>
            <p className="text-2xl font-bold text-emerald-400">{assinados}</p>
          </button>
          <button
            onClick={() => setStatusFilter('overdue')}
            className={`bg-dark-card rounded-xl p-4 text-left transition-all hover-lift ${statusFilter === 'overdue' ? 'ring-2 ring-red-400' : ''}`}
          >
            <p className="text-red-400 text-xs mb-1">Atrasados (24h+)</p>
            <p className={`text-2xl font-bold text-red-400 ${atrasados > 0 ? 'animate-pulse' : ''}`}>{atrasados}</p>
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por aluno, turma ou curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
            />
          </div>
        </div>

        {/* List grouped by turma */}
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
                    const key = `${item.aluno_id}-${item.turma_id}`;

                    return (
                      <div
                        key={key}
                        className={`px-6 py-4 flex items-center justify-between hover:bg-dark-lighter/50 transition-colors ${overdue ? 'bg-red-500/5' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white truncate">{item.aluno_nome}</span>
                            {overdue && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 animate-pulse">
                                <AlertTriangle className="h-3 w-3" />
                                24h+
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                            <a
                              href={`https://wa.me/${(item.aluno_whatsapp || '').replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-400 hover:text-green-300 transition-colors"
                            >
                              📱 {formatPhone(item.aluno_whatsapp || '')}
                            </a>
                            {item.aluno_email && <span>📧 {item.aluno_email}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 ml-4">
                          {/* Status badge */}
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${cfg.bg} ${overdue ? 'animate-pulse' : ''}`}>
                            <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
                            <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                            {item.contrato_created_at && status === 'pending' && (
                              <span className="text-[10px] text-gray-500 ml-1">
                                {formatTimeAgo(item.contrato_created_at)}
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          {status === 'none' ? (
                            <button
                              onClick={() => handleOpenContractForm(item)}
                              disabled={generatingContract === key}
                              className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {generatingContract === key ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <FileSignature className="h-3.5 w-3.5" />
                              )}
                              <span>{generatingContract === key ? 'Gerando...' : 'Gerar Contrato'}</span>
                            </button>
                          ) : item.sign_url && status === 'pending' ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleCopyLink(item.sign_url!)}
                                className="p-2 text-gray-400 hover:text-teal-accent transition-colors rounded-lg hover:bg-teal-accent/10"
                                title="Copiar link para WhatsApp"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <a
                                href={item.sign_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-400 hover:text-teal-accent transition-colors rounded-lg hover:bg-teal-accent/10"
                                title="Abrir contrato"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          ) : item.signed_at ? (
                            <span className="text-[10px] text-emerald-400/70">
                              {new Date(item.signed_at).toLocaleDateString('pt-BR')}
                            </span>
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

      {/* Modal de Dados de Pagamento */}
      {contractForm.isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={() => setContractForm(prev => ({ ...prev, isOpen: false }))}>
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="h-6 w-6 text-purple-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Dados do Pagamento</h3>
                <p className="text-sm text-gray-400">{contractForm.alunoNome}</p>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mb-4">
              Preencha os valores de pagamento que aparecerão no contrato. Campos vazios ficarão em branco no documento.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Taxa de Reserva</label>
                <input
                  type="text"
                  value={contractForm.taxa_reserva}
                  onChange={e => setContractForm(prev => ({ ...prev, taxa_reserva: e.target.value }))}
                  placeholder="Ex: R$ 500,00"
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Saldo via PIX</label>
                <input
                  type="text"
                  value={contractForm.saldo_pix}
                  onChange={e => setContractForm(prev => ({ ...prev, saldo_pix: e.target.value }))}
                  placeholder="Ex: R$ 2.500,00"
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Parcelas (Cartão)</label>
                  <input
                    type="text"
                    value={contractForm.parcelas_cartao}
                    onChange={e => setContractForm(prev => ({ ...prev, parcelas_cartao: e.target.value }))}
                    placeholder="Ex: 12x"
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Valor da Parcela</label>
                  <input
                    type="text"
                    value={contractForm.valor_parcela}
                    onChange={e => setContractForm(prev => ({ ...prev, valor_parcela: e.target.value }))}
                    placeholder="Ex: R$ 250,00"
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setContractForm(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-dark-lighter text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateContract}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm flex items-center gap-2"
              >
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
