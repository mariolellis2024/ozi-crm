import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import { DollarSign, Check, Clock, AlertTriangle, Filter, Plus, Undo2, X, Trash2, AlertCircle, Search, FileText, Receipt, Upload, Loader2, Users, GraduationCap } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import toast from 'react-hot-toast';
import { useUnidade } from '../contexts/UnidadeContext';

interface Pagamento {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  aluno_whatsapp: string;
  curso_id: string;
  curso_nome: string;
  turma_id: string;
  turma_nome: string;
  parcela: number;
  total_parcelas: number;
  valor: number;
  status: string;
  due_date: string;
  paid_date: string | null;
  payment_method: string | null;
  notes: string | null;
}

interface Summary {
  pendente: number;
  pago: number;
  atrasado: number;
  total_pago: number;
  total_pendente: number;
  total_atrasado: number;
}

interface Aluno { id: string; nome: string; }
interface Curso { id: string; nome: string; preco: number; }
interface MissingPayment {
  aluno_id: string; aluno_nome: string;
  curso_id: string; curso_nome: string; curso_preco: number;
  turma_id: string; turma_nome: string;
  total_registrado: number; total_pago: number; parcelas_count: number;
}

interface ProfPagamento {
  id: string;
  professor_id: string;
  professor_nome: string;
  professor_whatsapp: string;
  turma_id: string;
  turma_nome: string;
  curso_nome: string;
  unidade_nome: string;
  parcela: number;
  valor: number;
  due_date: string;
  status: string;
  paid_date: string | null;
  recibo_url: string | null;
  nota_fiscal_url: string | null;
}

interface ProfSummary {
  pago: number;
  pendente: number;
  atrasado: number;
  total_pago: number;
  total_pendente: number;
  total_atrasado: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: 'Pendente', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: Clock },
  pago: { label: 'Pago', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: Check },
  atrasado: { label: 'Atrasado', color: 'text-red-400 bg-red-500/10 border-red-500/30', icon: AlertTriangle },
};

export function Pagamentos() {
  const { selectedUnidadeId } = useUnidade();
  const [activeTab, setActiveTab] = useState<'alunos' | 'professores'>('alunos');
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [summary, setSummary] = useState<Summary>({ pendente: 0, pago: 0, atrasado: 0, total_pago: 0, total_pendente: 0, total_atrasado: 0 });
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [form, setForm] = useState({
    aluno_id: '', curso_id: '', total_parcelas: '1', valor_total: '', first_due_date: ''
  });
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
  const [missingPayments, setMissingPayments] = useState<MissingPayment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cursoFilter, setCursoFilter] = useState('');

  useEffect(() => { loadData(); }, [filter, selectedUnidadeId]);

  async function loadData() {
    try {
      let params = filter ? `?status=${filter}` : '';
      if (selectedUnidadeId) {
        params += (params ? '&' : '?') + `unidade_id=${selectedUnidadeId}`;
      }
      const data = await api.get(`/api/pagamentos${params}`);
      setPagamentos(data.data);
      setSummary(data.summary);
      // Also load missing payments
      try {
        const missing = await api.get('/api/pagamentos/missing');
        setMissingPayments(missing);
      } catch { setMissingPayments([]); }
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    }
  }

  async function loadFormData() {
    const [a, c] = await Promise.all([api.get('/api/alunos'), api.get('/api/cursos')]);
    setAlunos(Array.isArray(a) ? a : a.data || []);
    setCursos(c);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/api/pagamentos/generate', {
        aluno_id: form.aluno_id,
        curso_id: form.curso_id,
        total_parcelas: parseInt(form.total_parcelas),
        valor_total: parseFloat(form.valor_total),
        first_due_date: form.first_due_date,
      });
      toast.success(`${form.total_parcelas} parcela(s) gerada(s) com sucesso!`);
      setShowModal(false);
      setForm({ aluno_id: '', curso_id: '', total_parcelas: '1', valor_total: '', first_due_date: '' });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar parcelas');
    }
  }

  async function handleMarkPaid(id: string) {
    try {
      await api.put(`/api/pagamentos/${id}/pay`, {});
      toast.success('Pagamento confirmado!');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao confirmar pagamento');
    }
  }

  async function handleUndo(id: string) {
    try {
      await api.put(`/api/pagamentos/${id}/undo`, {});
      toast.success('Pagamento estornado');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao estornar');
    }
  }

  async function handleDelete(id: string) {
    setConfirmDelete({ isOpen: true, id });
  }

  async function handleConfirmDelete() {
    try {
      await api.delete(`/api/pagamentos/${confirmDelete.id}`);
      toast.success('Pagamento excluído');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir');
    } finally {
      setConfirmDelete({ isOpen: false, id: '' });
    }
  }

  function openModal() {
    loadFormData();
    setShowModal(true);
  }

  function isOverdue(dueDate: string, status: string) {
    return status === 'pendente' && new Date(dueDate + 'T23:59:59') < new Date();
  }

  const selectedCurso = cursos.find(c => c.id === form.curso_id);

  // Client-side filtering for search and curso
  const filteredPagamentos = useMemo(() => {
    let result = pagamentos;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.aluno_nome.toLowerCase().includes(term) ||
        p.aluno_whatsapp.includes(term)
      );
    }
    if (cursoFilter) {
      result = result.filter(p => p.curso_id === cursoFilter);
    }
    return result;
  }, [pagamentos, searchTerm, cursoFilter]);

  // Get unique cursos from loaded pagamentos
  const cursosFromPagamentos = useMemo(() => {
    const map = new Map<string, string>();
    pagamentos.forEach(p => map.set(p.curso_id, p.curso_nome));
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [pagamentos]);

  // === PROFESSOR PAYMENTS STATE ===
  const [profPagamentos, setProfPagamentos] = useState<ProfPagamento[]>([]);
  const [profSummary, setProfSummary] = useState<ProfSummary>({ pago: 0, pendente: 0, atrasado: 0, total_pago: 0, total_pendente: 0, total_atrasado: 0 });
  const [profFilter, setProfFilter] = useState('');
  const [profSearch, setProfSearch] = useState('');
  const [uploadingRecibo, setUploadingRecibo] = useState<string | null>(null);
  const [uploadingNF, setUploadingNF] = useState<string | null>(null);
  const reciboInputRef = useRef<HTMLInputElement>(null);
  const nfInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadId, setActiveUploadId] = useState<string>('');

  useEffect(() => { if (activeTab === 'professores') loadProfData(); }, [profFilter, selectedUnidadeId, activeTab]);

  async function loadProfData() {
    try {
      let params = profFilter ? `?status=${profFilter}` : '';
      if (selectedUnidadeId) params += (params ? '&' : '?') + `unidade_id=${selectedUnidadeId}`;
      const data = await api.get(`/api/professor-pagamentos${params}`);
      setProfPagamentos(data.data);
      setProfSummary(data.summary);
    } catch (error) {
      console.error('Erro ao carregar pagamentos de professores:', error);
    }
  }

  async function handleProfMarkPaid(id: string) {
    try {
      await api.put(`/api/professor-pagamentos/${id}/pay`, {});
      toast.success('Pagamento confirmado!');
      loadProfData();
    } catch (error: any) { toast.error(error.message || 'Erro'); }
  }

  async function handleProfUndo(id: string) {
    try {
      await api.put(`/api/professor-pagamentos/${id}/undo`, {});
      toast.success('Pagamento estornado');
      loadProfData();
    } catch (error: any) { toast.error(error.message || 'Erro'); }
  }

  async function handleFileUpload(file: File, id: string, type: 'recibo' | 'nota-fiscal') {
    if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo deve ter no máximo 10MB'); return; }
    const setter = type === 'recibo' ? setUploadingRecibo : setUploadingNF;
    setter(id);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });
      if (!response.ok) throw new Error('Erro ao fazer upload');
      const data = await response.json();
      const fieldName = type === 'recibo' ? 'recibo_url' : 'nota_fiscal_url';
      await api.put(`/api/professor-pagamentos/${id}/${type}`, { [fieldName]: data.url });
      toast.success(type === 'recibo' ? 'Recibo anexado!' : 'Nota fiscal anexada!');
      loadProfData();
    } catch (error: any) { toast.error(error.message || 'Erro ao enviar arquivo'); }
    finally { setter(null); }
  }

  function triggerUpload(id: string, type: 'recibo' | 'nota-fiscal') {
    setActiveUploadId(id);
    if (type === 'recibo') reciboInputRef.current?.click();
    else nfInputRef.current?.click();
  }

  const filteredProfPagamentos = useMemo(() => {
    if (!profSearch.trim()) return profPagamentos;
    const term = profSearch.toLowerCase();
    return profPagamentos.filter(p => p.professor_nome.toLowerCase().includes(term) || p.curso_nome.toLowerCase().includes(term));
  }, [profPagamentos, profSearch]);

  const isSuperAdmin = useMemo(() => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return false;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role === 'super_admin';
    } catch { return false; }
  }, []);

  return (
    <div className="p-8 fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Financeiro</h1>
            <p className="text-gray-400 mt-1">Controle de pagamentos de alunos e professores</p>
          </div>
          {activeTab === 'alunos' && (
            <button onClick={openModal} className="bg-teal-accent text-dark px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-teal-400 transition-all font-medium shadow-glow hover:shadow-glow-intense">
              <Plus className="h-5 w-5" />
              Gerar Parcelas
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-dark-card rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('alunos')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'alunos' ? 'bg-teal-accent text-dark shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" /> Alunos
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('professores')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'professores' ? 'bg-teal-accent text-dark shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <GraduationCap className="h-4 w-4" /> Professores
            </button>
          )}
        </div>

        {activeTab === 'alunos' && (<>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-dark-card rounded-xl p-4 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Recebido</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(summary.total_pago)}</p>
                <p className="text-xs text-gray-500">{summary.pago} parcela(s)</p>
              </div>
              <Check className="h-8 w-8 text-emerald-500/30" />
            </div>
          </div>
          <div className="bg-dark-card rounded-xl p-4 border border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Pendente</p>
                <p className="text-xl font-bold text-amber-400">{formatCurrency(summary.total_pendente)}</p>
                <p className="text-xs text-gray-500">{summary.pendente} parcela(s)</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500/30" />
            </div>
          </div>
          <div className="bg-dark-card rounded-xl p-4 border border-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Atrasado</p>
                <p className="text-xl font-bold text-red-400">{formatCurrency(summary.total_atrasado)}</p>
                <p className="text-xs text-gray-500">{summary.atrasado} parcela(s)</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500/30" />
            </div>
          </div>
        </div>

        {/* Missing Payments Alert */}
        {missingPayments.length > 0 && (
          <div className="mb-6 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              <h3 className="text-amber-400 font-medium text-sm">
                {missingPayments.length} aluno{missingPayments.length > 1 ? 's' : ''} matriculado{missingPayments.length > 1 ? 's' : ''} sem pagamento registrado
              </h3>
            </div>
            <div className="space-y-2">
              {missingPayments.map((m, i) => (
                <div key={i} className="flex items-center justify-between bg-dark-lighter/50 rounded-lg px-3 py-2">
                  <div className="text-sm">
                    <span className="text-white font-medium">{m.aluno_nome}</span>
                    <span className="text-gray-400 mx-2">&bull;</span>
                    <span className="text-gray-400">{m.curso_nome}</span>
                    {m.turma_nome && <span className="text-gray-500 text-xs ml-2">({m.turma_nome})</span>}
                    <span className="ml-2 text-xs">
                      {m.parcelas_count === 0 ? (
                        <span className="text-red-400">Nenhuma parcela registrada</span>
                      ) : (
                        <span className="text-amber-400">
                          {formatCurrency(m.total_registrado)} de {formatCurrency(m.curso_preco)} registrado • faltam {formatCurrency(m.curso_preco - m.total_registrado)}
                        </span>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      await loadFormData();
                      setForm({
                        aluno_id: m.aluno_id,
                        curso_id: m.curso_id,
                        total_parcelas: '1',
                        valor_total: String(m.curso_preco),
                        first_due_date: new Date().toISOString().split('T')[0]
                      });
                      setShowModal(true);
                    }}
                    className="px-3 py-1 rounded-lg bg-teal-accent/20 text-teal-accent hover:bg-teal-accent/30 text-xs font-medium transition-colors whitespace-nowrap"
                  >
                    Gerar Parcelas
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            {['', 'pendente', 'pago', 'atrasado'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === s ? 'bg-teal-accent text-dark' : 'bg-dark-lighter text-gray-400 hover:text-white'
                }`}
              >
                {s === '' ? 'Todos' : STATUS_CONFIG[s]?.label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[200px] max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar por nome ou WhatsApp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-dark-lighter border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent/50 placeholder-gray-500"
              />
            </div>
          </div>

          {cursosFromPagamentos.length > 1 && (
            <select
              value={cursoFilter}
              onChange={(e) => setCursoFilter(e.target.value)}
              className="px-3 py-1.5 bg-dark-lighter border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-accent/50"
            >
              <option value="">Todos os cursos</option>
              {cursosFromPagamentos.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          )}

          {(searchTerm || cursoFilter) && (
            <span className="text-xs text-gray-500">
              {filteredPagamentos.length} resultado{filteredPagamentos.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="bg-dark-card rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-lighter">
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Aluno</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Curso</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm">Parcela</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">Valor</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm">Vencimento</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm">Status</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredPagamentos.map(p => {
                const overdue = isOverdue(p.due_date, p.status);
                const cfg = STATUS_CONFIG[overdue ? 'atrasado' : p.status] || STATUS_CONFIG.pendente;
                const StatusIcon = cfg.icon;
                return (
                  <tr key={p.id} className={`border-b border-dark-lighter/50 hover:bg-dark-lighter/30 transition-colors ${overdue ? 'bg-red-500/5' : ''}`}>
                    <td className="py-3 px-4 text-white text-sm">{p.aluno_nome}</td>
                    <td className="py-3 px-4 text-gray-300 text-sm">{p.curso_nome}</td>
                    <td className="py-3 px-4 text-center text-gray-400 text-sm">{p.parcela}/{p.total_parcelas}</td>
                    <td className="py-3 px-4 text-right text-white text-sm font-medium">{formatCurrency(p.valor)}</td>
                    <td className="py-3 px-4 text-center text-sm">
                      <span className={overdue ? 'text-red-400 font-medium' : 'text-gray-400'}>
                        {new Date(p.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {overdue ? 'Atrasado' : cfg.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === 'pago' ? (
                          <button onClick={() => handleUndo(p.id)} className="p-1.5 text-gray-400 hover:text-amber-400 transition-colors" title="Estornar">
                            <Undo2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <button onClick={() => handleMarkPaid(p.id)} className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-medium transition-colors">
                            Confirmar ✓
                          </button>
                        )}
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors" title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pagamentos.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-gray-500">
                  <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  Nenhum pagamento {filter ? `com status "${filter}"` : 'registrado'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        </>)}

        {/* === PROFESSOR TAB === */}
        {activeTab === 'professores' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-dark-card rounded-xl p-4 border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs">Pago</p>
                    <p className="text-xl font-bold text-emerald-400">{formatCurrency(profSummary.total_pago)}</p>
                    <p className="text-xs text-gray-500">{profSummary.pago} pagamento(s)</p>
                  </div>
                  <Check className="h-8 w-8 text-emerald-500/30" />
                </div>
              </div>
              <div className="bg-dark-card rounded-xl p-4 border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs">Pendente</p>
                    <p className="text-xl font-bold text-amber-400">{formatCurrency(profSummary.total_pendente)}</p>
                    <p className="text-xs text-gray-500">{profSummary.pendente} pagamento(s)</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-500/30" />
                </div>
              </div>
              <div className="bg-dark-card rounded-xl p-4 border border-red-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs">Atrasado</p>
                    <p className="text-xl font-bold text-red-400">{formatCurrency(profSummary.total_atrasado)}</p>
                    <p className="text-xs text-gray-500">{profSummary.atrasado} pagamento(s)</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500/30" />
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                {['', 'pendente', 'pago', 'atrasado'].map(s => (
                  <button key={s} onClick={() => setProfFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      profFilter === s ? 'bg-teal-accent text-dark' : 'bg-dark-lighter text-gray-400 hover:text-white'
                    }`}
                  >
                    {s === '' ? 'Todos' : STATUS_CONFIG[s]?.label}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-w-[200px] max-w-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="text" placeholder="Buscar professor ou curso..."
                    value={profSearch} onChange={e => setProfSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-dark-lighter border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent/50 placeholder-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-dark-card rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-lighter">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Professor</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Turma / Curso</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm">Parcela</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">Valor</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm">Vencimento</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm">Status</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm">Recibo</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm">NF</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfPagamentos.map(p => {
                    const overdue = p.status === 'pendente' && new Date(p.due_date + 'T23:59:59') < new Date();
                    const cfg = STATUS_CONFIG[overdue ? 'atrasado' : p.status] || STATUS_CONFIG.pendente;
                    const StatusIcon = cfg.icon;
                    return (
                      <tr key={p.id} className={`border-b border-dark-lighter/50 hover:bg-dark-lighter/30 transition-colors ${overdue ? 'bg-red-500/5' : ''}`}>
                        <td className="py-3 px-4 text-white text-sm">{p.professor_nome}</td>
                        <td className="py-3 px-4 text-sm">
                          <span className="text-gray-300">{p.turma_nome}</span>
                          <span className="text-gray-500 text-xs block">{p.curso_nome}</span>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-400 text-sm">{p.parcela}</td>
                        <td className="py-3 px-4 text-right text-white text-sm font-medium">{formatCurrency(p.valor)}</td>
                        <td className="py-3 px-4 text-center text-sm">
                          <span className={overdue ? 'text-red-400 font-medium' : 'text-gray-400'}>
                            {new Date(p.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {overdue ? 'Atrasado' : cfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {uploadingRecibo === p.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-teal-accent mx-auto" />
                          ) : p.recibo_url ? (
                            <div className="flex items-center justify-center gap-1">
                              <a href={p.recibo_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300" title="Ver recibo">
                                <Receipt className="h-4 w-4" />
                              </a>
                              <button onClick={() => triggerUpload(p.id, 'recibo')} className="text-gray-500 hover:text-teal-accent" title="Trocar recibo">
                                <Upload className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => triggerUpload(p.id, 'recibo')} className="text-gray-500 hover:text-teal-accent transition-colors" title="Anexar recibo">
                              <Upload className="h-4 w-4 mx-auto" />
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {uploadingNF === p.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-teal-accent mx-auto" />
                          ) : p.nota_fiscal_url ? (
                            <div className="flex items-center justify-center gap-1">
                              <a href={p.nota_fiscal_url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300" title="Ver NF">
                                <FileText className="h-4 w-4" />
                              </a>
                              <button onClick={() => triggerUpload(p.id, 'nota-fiscal')} className="text-gray-500 hover:text-teal-accent" title="Trocar NF">
                                <Upload className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => triggerUpload(p.id, 'nota-fiscal')} className="text-gray-500 hover:text-purple-400 transition-colors" title="Anexar NF">
                              <Upload className="h-4 w-4 mx-auto" />
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {p.status === 'pago' ? (
                              <button onClick={() => handleProfUndo(p.id)} className="p-1.5 text-gray-400 hover:text-amber-400 transition-colors" title="Estornar">
                                <Undo2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <button onClick={() => handleProfMarkPaid(p.id)} className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-medium transition-colors">
                                Confirmar ✓
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {profPagamentos.length === 0 && (
                    <tr><td colSpan={9} className="py-12 text-center text-gray-500">
                      <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      Nenhum pagamento de professor {profFilter ? `com status "${profFilter}"` : 'registrado'}
                      <p className="text-xs text-gray-600 mt-2">Os pagamentos são gerados automaticamente ao vincular professores a turmas.</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Hidden file inputs */}
            <input ref={reciboInputRef} type="file" accept="image/*,application/pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f && activeUploadId) handleFileUpload(f, activeUploadId, 'recibo'); e.target.value = ''; }} />
            <input ref={nfInputRef} type="file" accept="image/*,application/pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f && activeUploadId) handleFileUpload(f, activeUploadId, 'nota-fiscal'); e.target.value = ''; }} />
          </>
        )}
      </div>

      {/* Generate Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 fade-in">
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-md scale-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Gerar Parcelas</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Aluno</label>
                <select required value={form.aluno_id} onChange={e => setForm({...form, aluno_id: e.target.value})}
                  className="w-full bg-dark-lighter text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-teal-accent outline-none">
                  <option value="">Selecione...</option>
                  {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Curso</label>
                <select required value={form.curso_id} onChange={e => {
                  const c = cursos.find(c => c.id === e.target.value);
                  setForm({...form, curso_id: e.target.value, valor_total: c ? String(c.preco) : ''});
                }}
                  className="w-full bg-dark-lighter text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-teal-accent outline-none">
                  <option value="">Selecione...</option>
                  {cursos.map(c => <option key={c.id} value={c.id}>{c.nome} ({formatCurrency(c.preco)})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nº Parcelas</label>
                  <input type="number" min="1" max="24" required value={form.total_parcelas}
                    onChange={e => setForm({...form, total_parcelas: e.target.value})}
                    className="w-full bg-dark-lighter text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-teal-accent outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Valor Total</label>
                  <input type="number" step="0.01" min="0" required value={form.valor_total}
                    onChange={e => setForm({...form, valor_total: e.target.value})}
                    className="w-full bg-dark-lighter text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-teal-accent outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">1º Vencimento</label>
                <input type="date" required value={form.first_due_date}
                  onChange={e => setForm({...form, first_due_date: e.target.value})}
                  className="w-full bg-dark-lighter text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-teal-accent outline-none" />
              </div>
              {selectedCurso && parseInt(form.total_parcelas) > 0 && parseFloat(form.valor_total) > 0 && (
                <div className="bg-dark-lighter rounded-xl p-3 text-sm">
                  <p className="text-gray-400">{form.total_parcelas}x de <span className="text-white font-medium">{formatCurrency(parseFloat(form.valor_total) / parseInt(form.total_parcelas))}</span></p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl bg-dark-lighter text-gray-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-teal-accent text-dark font-medium hover:bg-teal-400 transition-colors">Gerar</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete.isOpen && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10001] p-4 fade-in">
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-sm scale-in">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h3 className="text-xl font-semibold text-white">Excluir Pagamento</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Tem certeza que deseja excluir este pagamento? Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete({ isOpen: false, id: '' })}
                className="px-4 py-2 bg-dark-lighter text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
