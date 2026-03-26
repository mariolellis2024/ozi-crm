import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import { DollarSign, Check, Clock, AlertTriangle, Filter, Plus, Undo2, X, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import toast from 'react-hot-toast';

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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: 'Pendente', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: Clock },
  pago: { label: 'Pago', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: Check },
  atrasado: { label: 'Atrasado', color: 'text-red-400 bg-red-500/10 border-red-500/30', icon: AlertTriangle },
};

export function Pagamentos() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [summary, setSummary] = useState<Summary>({ pendente: 0, pago: 0, atrasado: 0, total_pago: 0, total_pendente: 0, total_atrasado: 0 });
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [form, setForm] = useState({
    aluno_id: '', curso_id: '', total_parcelas: '1', valor_total: '', first_due_date: ''
  });

  useEffect(() => { loadData(); }, [filter]);

  async function loadData() {
    try {
      const params = filter ? `?status=${filter}` : '';
      const data = await api.get(`/api/pagamentos${params}`);
      setPagamentos(data.data);
      setSummary(data.summary);
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
    if (!confirm('Tem certeza que deseja excluir este pagamento?')) return;
    try {
      await api.delete(`/api/pagamentos/${id}`);
      toast.success('Pagamento excluído');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir');
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

  return (
    <div className="p-8 fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Pagamentos</h1>
            <p className="text-gray-400 mt-2">Controle de parcelas e inadimplência</p>
          </div>
          <button onClick={openModal} className="bg-teal-accent text-dark px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-teal-400 transition-all font-medium shadow-glow hover:shadow-glow-intense">
            <Plus className="h-5 w-5" />
            Gerar Parcelas
          </button>
        </div>

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

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
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
              {pagamentos.map(p => {
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
    </div>
  );
}
