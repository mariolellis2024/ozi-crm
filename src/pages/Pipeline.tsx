import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import { Filter, X, MessageCircle, ClipboardList, AlertTriangle } from 'lucide-react';
import { formatPhone, formatCurrency } from '../utils/format';
import toast from 'react-hot-toast';
import { useUnidade } from '../contexts/UnidadeContext';

interface Interest {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  aluno_email: string;
  aluno_whatsapp: string;
  aluno_unidade_id: string | null;
  curso_id: string;
  curso_nome: string;
  curso_preco: number | string | null;
  status: string;
  turma_id: string | null;
  created_at: string;
  unidade_nome: string | null;
}

interface Curso {
  id: string;
  nome: string;
}

interface Turma {
  id: string;
  name: string;
  curso_id: string;
  curso: { nome: string; preco: number };
  period: string;
  start_date: string;
  end_date: string;
  cadeiras: number;
  enrolled_count: number;
  unidade_nome: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  interested: { label: 'Interessados', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/30' },
  enrolled: { label: 'Matriculados', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/30' },
  completed: { label: 'Concluídos', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/30' },
  lost: { label: 'Perdidos', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/30' },
};

const COLUMNS = ['interested', 'enrolled', 'completed', 'lost'];

export function Pipeline() {
  const { selectedUnidadeId } = useUnidade();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [allTurmas, setAllTurmas] = useState<Turma[]>([]);
  const [selectedCurso, setSelectedCurso] = useState('');
  const [draggedItem, setDraggedItem] = useState<Interest | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Enrollment modal state
  const [enrollModal, setEnrollModal] = useState<{
    isOpen: boolean;
    interest: Interest | null;
    turmas: Turma[];
    selectedTurmaId: string;
    genero: string;
    dataNascimento: string;
    cep: string;
    loading: boolean;
    hasExistingData: boolean;
  }>({
    isOpen: false, interest: null, turmas: [], selectedTurmaId: '',
    genero: '', dataNascimento: '', cep: '', loading: false, hasExistingData: false
  });

  // Loss reason modal
  const [lossModal, setLossModal] = useState<{
    isOpen: boolean;
    interest: Interest | null;
    motivo: string;
    loading: boolean;
  }>({ isOpen: false, interest: null, motivo: '', loading: false });

  // Unenroll confirmation modal (when moving enrolled student out)
  const [unenrollModal, setUnenrollModal] = useState<{
    isOpen: boolean;
    interest: Interest | null;
    targetStatus: string;
    loading: boolean;
  }>({ isOpen: false, interest: null, targetStatus: '', loading: false });

  // Delete payments confirmation modal
  const [deletePaymentsModal, setDeletePaymentsModal] = useState<{
    isOpen: boolean;
    interest: Interest | null;
    targetStatus: string;
    paymentCount: number;
    paymentTotal: number;
    loading: boolean;
  }>({ isOpen: false, interest: null, targetStatus: '', paymentCount: 0, paymentTotal: 0, loading: false });

  // History modal
  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    alunoId: string;
    alunoNome: string;
    entries: any[];
    newEntry: string;
    loading: boolean;
  }>({ isOpen: false, alunoId: '', alunoNome: '', entries: [], newEntry: '', loading: false });

  async function openHistory(interest: Interest) {
    setHistoryModal({ isOpen: true, alunoId: interest.aluno_id, alunoNome: interest.aluno_nome, entries: [], newEntry: '', loading: true });
    try {
      const data = await api.get(`/api/contact-history/${interest.aluno_id}`);
      setHistoryModal(prev => ({ ...prev, entries: data, loading: false }));
    } catch {
      setHistoryModal(prev => ({ ...prev, loading: false }));
    }
  }

  async function addHistoryEntry() {
    if (!historyModal.newEntry.trim()) return;
    try {
      await api.post('/api/contact-history', {
        aluno_id: historyModal.alunoId,
        tipo: 'contato',
        descricao: historyModal.newEntry
      });
      const data = await api.get(`/api/contact-history/${historyModal.alunoId}`);
      setHistoryModal(prev => ({ ...prev, entries: data, newEntry: '' }));
      toast.success('Registro adicionado');
    } catch {
      toast.error('Erro ao salvar registro');
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedUnidadeId]);

  async function loadData() {
    try {
      const unidadeParam = selectedUnidadeId ? `?unidade_id=${selectedUnidadeId}` : '';
      const [cursosData, interestsData, turmasData] = await Promise.all([
        api.get('/api/cursos'),
        api.get(`/api/pipeline${unidadeParam}`),
        api.get(`/api/turmas${unidadeParam}`)
      ]);
      setCursos(cursosData);
      setInterests(interestsData);
      setAllTurmas(turmasData);
    } catch (error) {
      console.error('Erro ao carregar pipeline:', error);
    }
  }

  async function openEnrollModal(interest: Interest) {
    // Find turmas for this curso AND this student's unidade
    const availableTurmas = allTurmas.filter(t => {
      if (t.curso_id !== interest.curso_id) return false;
      // Filter by student's unidade if available
      if (interest.aluno_unidade_id && (t as any).sala?.unidade_id) {
        if ((t as any).sala.unidade_id !== interest.aluno_unidade_id) return false;
      }
      return true;
    });

    if (availableTurmas.length === 0) {
      toast.error('Nenhuma turma aberta para este curso. Crie uma turma primeiro.');
      return;
    }

    // Fetch aluno data for pre-fill
    let genero = '', dataNascimento = '', cep = '', hasExistingData = false;
    try {
      const aluno = await api.get(`/api/alunos/${interest.aluno_id}`);
      // Normalize legacy gender values ('m' -> 'masculino', 'f' -> 'feminino')
      const rawGenero = (aluno.genero || '').toLowerCase();
      genero = rawGenero === 'm' ? 'masculino' : rawGenero === 'f' ? 'feminino' : rawGenero;
      dataNascimento = aluno.data_nascimento || '';
      cep = aluno.cep || '';
      hasExistingData = !!(genero && dataNascimento && cep);
    } catch { /* ignore */ }

    setEnrollModal({
      isOpen: true,
      interest,
      turmas: availableTurmas,
      selectedTurmaId: availableTurmas.length === 1 ? availableTurmas[0].id : '',
      genero,
      dataNascimento: dataNascimento ? new Date(dataNascimento).toISOString().split('T')[0] : '',
      cep,
      loading: false,
      hasExistingData
    });
  }

  async function handleEnroll() {
    const { interest, selectedTurmaId, genero, dataNascimento, cep } = enrollModal;
    if (!interest || !selectedTurmaId) {
      toast.error('Selecione uma turma');
      return;
    }
    if (!genero || !dataNascimento || !cep || cep.replace(/\D/g, '').length < 5) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setEnrollModal(prev => ({ ...prev, loading: true }));

    try {
      await api.post('/api/interests/enroll', {
        aluno_id: interest.aluno_id,
        curso_id: interest.curso_id,
        turma_id: selectedTurmaId,
        genero,
        data_nascimento: dataNascimento,
        cep: cep.replace(/\D/g, '')
      });
      toast.success(`${interest.aluno_nome} matriculado(a) com sucesso!`);
      setEnrollModal(prev => ({ ...prev, isOpen: false }));
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao matricular');
    } finally {
      setEnrollModal(prev => ({ ...prev, loading: false }));
    }
  }

  async function moveToStatus(interest: Interest, newStatus: string) {
    if (interest.status === newStatus) return;

    // If moving to enrolled, open enrollment modal
    if (newStatus === 'enrolled') {
      openEnrollModal(interest);
      return;
    }

    // If student is enrolled and moving to interested or lost, confirm unenrollment
    if (interest.status === 'enrolled' && (newStatus === 'interested' || newStatus === 'lost')) {
      setUnenrollModal({ isOpen: true, interest, targetStatus: newStatus, loading: false });
      return;
    }

    // If moving to lost (from non-enrolled), ask for reason
    if (newStatus === 'lost') {
      setLossModal({ isOpen: true, interest, motivo: '', loading: false });
      return;
    }

    try {
      await api.put(`/api/interests/${interest.id}/status`, { status: newStatus });
      toast.success(`Aluno movido para ${STATUS_CONFIG[newStatus].label}`);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao mover aluno');
    }
  }

  async function handleUnenrollConfirm() {
    if (!unenrollModal.interest) return;
    const { interest, targetStatus } = unenrollModal;
    setUnenrollModal(prev => ({ ...prev, loading: true }));

    try {
      // Check if there are payments linked to this enrollment
      let paymentData = { count: 0, total: 0 };
      if (interest.turma_id) {
        paymentData = await api.get(`/api/interests/check-payments/${interest.aluno_id}/${interest.turma_id}`);
      }

      // Close unenroll modal
      setUnenrollModal({ isOpen: false, interest: null, targetStatus: '', loading: false });

      if (paymentData.count > 0) {
        // Ask about deleting payments
        setDeletePaymentsModal({
          isOpen: true,
          interest,
          targetStatus,
          paymentCount: paymentData.count,
          paymentTotal: paymentData.total,
          loading: false
        });
      } else {
        // No payments, proceed directly
        await proceedWithUnenroll(interest, targetStatus);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao verificar pagamentos');
      setUnenrollModal(prev => ({ ...prev, loading: false }));
    }
  }

  async function proceedWithUnenroll(interest: Interest, targetStatus: string, deletePayments = false) {
    try {
      // Delete payments if requested
      if (deletePayments && interest.turma_id) {
        await api.delete(`/api/pagamentos/by-enrollment/${interest.aluno_id}/${interest.turma_id}`);
        toast.success('Pagamentos deletados');
      }

      // If target is lost, open loss reason modal
      if (targetStatus === 'lost') {
        setLossModal({ isOpen: true, interest, motivo: '', loading: false });
        return;
      }

      // Move to interested (status update clears turma_id on backend)
      await api.put(`/api/interests/${interest.id}/status`, { status: targetStatus });
      toast.success(`${interest.aluno_nome} desmatriculado(a) e movido(a) para ${STATUS_CONFIG[targetStatus].label}`);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao desmatricular');
    }
  }

  async function handleDeletePaymentsYes() {
    if (!deletePaymentsModal.interest) return;
    const { interest, targetStatus } = deletePaymentsModal;
    setDeletePaymentsModal(prev => ({ ...prev, loading: true }));
    setDeletePaymentsModal({ isOpen: false, interest: null, targetStatus: '', paymentCount: 0, paymentTotal: 0, loading: false });
    await proceedWithUnenroll(interest, targetStatus, true);
  }

  async function handleDeletePaymentsNo() {
    if (!deletePaymentsModal.interest) return;
    const { interest, targetStatus } = deletePaymentsModal;
    setDeletePaymentsModal({ isOpen: false, interest: null, targetStatus: '', paymentCount: 0, paymentTotal: 0, loading: false });
    await proceedWithUnenroll(interest, targetStatus, false);
  }

  async function handleLostConfirm() {
    if (!lossModal.interest) return;
    setLossModal(prev => ({ ...prev, loading: true }));
    try {
      // Save contact history with loss reason
      await api.post('/api/contact-history', {
        aluno_id: lossModal.interest.aluno_id,
        tipo: 'perda',
        descricao: lossModal.motivo || 'Não quis continuar',
        motivo_perda: lossModal.motivo || 'Não quis continuar'
      });
      // Move to lost
      await api.put(`/api/interests/${lossModal.interest.id}/status`, { status: 'lost' });
      toast.success('Aluno marcado como perdido');
      setLossModal({ isOpen: false, interest: null, motivo: '', loading: false });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao marcar como perdido');
      setLossModal(prev => ({ ...prev, loading: false }));
    }
  }

  function handleDragStart(e: React.DragEvent, interest: Interest) {
    setDraggedItem(interest);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, column: string) {
    e.preventDefault();
    setDragOverColumn(column);
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  function handleDrop(e: React.DragEvent, column: string) {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedItem) {
      moveToStatus(draggedItem, column);
      setDraggedItem(null);
    }
  }

  function formatCep(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  function whatsappUrl(phone: string) {
    const digits = phone.replace(/\D/g, '');
    const full = digits.startsWith('55') ? digits : `55${digits}`;
    return `https://wa.me/${full}`;
  }

  const filtered = selectedCurso
    ? interests.filter(i => i.curso_id === selectedCurso)
    : interests;

  function getColumnItems(status: string) {
    return filtered.filter(i => i.status === status);
  }

  function daysSince(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / 86400000);
  }

  return (
    <div className="p-8 fade-in">
      <div className="max-w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Pipeline de Vendas</h1>
            <p className="text-gray-400 mt-2">Arraste os alunos entre as colunas para alterar o status</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={selectedCurso}
            onChange={(e) => setSelectedCurso(e.target.value)}
            className="bg-dark-card text-white px-4 py-2 rounded-xl border border-dark-lighter focus:ring-2 focus:ring-teal-accent outline-none text-sm"
          >
            <option value="">Todos os cursos</option>
            {cursos.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          <span className="text-gray-500 text-sm">{filtered.length} registros</span>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-4 gap-4 min-h-[60vh]">
          {COLUMNS.map(status => {
            const items = getColumnItems(status);
            const cfg = STATUS_CONFIG[status];
            const isDropTarget = dragOverColumn === status;

            return (
              <div
                key={status}
                className={`rounded-2xl border-2 transition-colors ${
                  isDropTarget ? 'border-teal-accent/50 bg-teal-accent/5' : `border-dark-lighter bg-dark-card/50`
                }`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column Header */}
                <div className="p-4 border-b border-dark-lighter">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-semibold ${cfg.color}`}>{cfg.label}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full border ${cfg.bgColor} font-medium`}>
                      {items.length}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-400">
                    {formatCurrency(items.reduce((acc, curr) => acc + (parseFloat(curr.curso_preco as string) || 0), 0))}
                  </div>
                </div>

                {/* Cards */}
                <div className="p-3 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {items.map(interest => {
                    const days = daysSince(interest.created_at);
                    const isStale = status === 'interested' && days > 7;

                    return (
                      <div
                        key={interest.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, interest)}
                        className={`bg-dark-card rounded-xl p-3 cursor-grab active:cursor-grabbing border transition-all hover:border-gray-600 ${
                          isStale ? 'border-amber-500/40' : 'border-dark-lighter'
                        } ${draggedItem?.id === interest.id ? 'opacity-50' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-white text-sm font-medium truncate">{interest.aluno_nome}</span>
                          {isStale && (
                            <span className="text-amber-400 text-[9px] whitespace-nowrap ml-2">⚠ {days}d</span>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs truncate">{interest.curso_nome}</p>
                        {interest.unidade_nome && (
                          <p className="text-[10px] mt-0.5">
                            <span className="px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              📍 {interest.unidade_nome}
                            </span>
                          </p>
                        )}
                        {interest.aluno_whatsapp && (
                          <a
                            href={whatsappUrl(interest.aluno_whatsapp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-400 text-[10px] mt-1 hover:text-emerald-300 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageCircle className="h-3 w-3" />
                            {formatPhone(interest.aluno_whatsapp)}
                          </a>
                        )}
                        {/* Quick actions */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {COLUMNS.filter(s => s !== status).map(targetStatus => (
                            <button
                              key={targetStatus}
                              onClick={() => moveToStatus(interest, targetStatus)}
                              className={`text-[9px] px-2 py-0.5 rounded-full border ${STATUS_CONFIG[targetStatus].bgColor} ${STATUS_CONFIG[targetStatus].color} hover:opacity-80 transition-opacity`}
                            >
                              → {STATUS_CONFIG[targetStatus].label}
                            </button>
                          ))}
                          <button
                            onClick={() => openHistory(interest)}
                            className="text-[9px] px-2 py-0.5 rounded-full border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                          >
                            <ClipboardList className="h-2.5 w-2.5 inline mr-0.5" />
                            Histórico
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {items.length === 0 && (
                    <div className="text-center py-8 text-gray-600 text-sm">
                      Arraste cards aqui
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact History modal */}
      {historyModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4" onClick={() => setHistoryModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Histórico de Contato</h2>
              <button onClick={() => setHistoryModal(prev => ({ ...prev, isOpen: false }))} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              <span className="text-white font-medium">{historyModal.alunoNome}</span>
            </p>

            {/* Add new entry */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={historyModal.newEntry}
                onChange={e => setHistoryModal(prev => ({ ...prev, newEntry: e.target.value }))}
                placeholder="Anotar contato, observação..."
                className="flex-1 bg-dark-lighter border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-accent/50 focus:outline-none"
                onKeyDown={e => e.key === 'Enter' && addHistoryEntry()}
              />
              <button
                onClick={addHistoryEntry}
                className="px-3 py-2 bg-teal-accent text-dark font-medium rounded-lg text-sm hover:bg-teal-400 transition-colors"
              >
                +
              </button>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {historyModal.loading ? (
                <p className="text-gray-500 text-sm text-center py-4">Carregando...</p>
              ) : historyModal.entries.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">Nenhum registro ainda</p>
              ) : (
                historyModal.entries.map((entry: any) => (
                  <div key={entry.id} className={`p-3 rounded-lg border text-sm ${
                    entry.tipo === 'perda' 
                      ? 'bg-red-500/10 border-red-500/20' 
                      : 'bg-dark-lighter border-gray-700'
                  }`}>
                    <div className="flex justify-between items-start">
                      <p className="text-white">{entry.descricao}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                        entry.tipo === 'perda' ? 'bg-red-500/20 text-red-400' : 'bg-teal-accent/20 text-teal-accent'
                      }`}>
                        {entry.tipo === 'perda' ? 'Perda' : 'Contato'}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-500 text-xs">{entry.user_name || entry.user_email || ''}</span>
                      <span className="text-gray-600 text-xs">{new Date(entry.created_at).toLocaleDateString('pt-BR')} {new Date(entry.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Loss reason modal */}
      {lossModal.isOpen && lossModal.interest && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4" onClick={() => setLossModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Marcar como Perdido</h2>
              <button onClick={() => setLossModal(prev => ({ ...prev, isOpen: false }))} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Por que <span className="text-white font-medium">{lossModal.interest.aluno_nome}</span> não quis continuar?
            </p>
            <textarea
              value={lossModal.motivo}
              onChange={e => setLossModal(prev => ({ ...prev, motivo: e.target.value }))}
              placeholder="Ex: Não tem interesse, achou caro, mudou de cidade..."
              rows={3}
              className="w-full bg-dark-lighter border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500/50 focus:outline-none mb-4 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setLossModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-xl hover:bg-dark-lighter transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleLostConfirm}
                disabled={lossModal.loading}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors text-sm disabled:opacity-50"
              >
                {lossModal.loading ? 'Salvando...' : '✗ Confirmar Perda'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Enrollment Modal */}
      {enrollModal.isOpen && enrollModal.interest && createPortal(
        <div
          className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setEnrollModal(prev => ({ ...prev, isOpen: false }))}
        >
          <div
            className="bg-dark-card rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Matricular Aluno</h2>
              <button onClick={() => setEnrollModal(prev => ({ ...prev, isOpen: false }))} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              Matriculando <span className="text-white font-medium">{enrollModal.interest.aluno_nome}</span> no curso <span className="text-teal-accent">{enrollModal.interest.curso_nome}</span>
            </p>

            {/* Turma Selection */}
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-1">Turma *</label>
              {enrollModal.turmas.length === 1 ? (
                <div className="bg-dark-lighter border border-gray-700 rounded-lg p-3">
                  <p className="text-white text-sm font-medium">{enrollModal.turmas[0].name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {enrollModal.turmas[0].period} • {enrollModal.turmas[0].unidade_nome}
                  </p>
                </div>
              ) : (
                <select
                  value={enrollModal.selectedTurmaId}
                  onChange={(e) => setEnrollModal(prev => ({ ...prev, selectedTurmaId: e.target.value }))}
                  className="w-full bg-dark-lighter border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-accent/50 focus:outline-none"
                >
                  <option value="">Selecione uma turma...</option>
                  {enrollModal.turmas.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} • {t.period} • {t.unidade_nome} ({t.enrolled_count}/{t.cadeiras} vagas)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Gender */}
            <div className="mb-3">
              <label className="block text-sm text-gray-300 mb-1">Gênero *</label>
              <select
                value={enrollModal.genero}
                onChange={(e) => setEnrollModal(prev => ({ ...prev, genero: e.target.value }))}
                className="w-full bg-dark-lighter border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-accent/50 focus:outline-none"
              >
                <option value="">Selecione...</option>
                <option value="feminino">Feminino</option>
                <option value="masculino">Masculino</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            {/* DOB */}
            <div className="mb-3">
              <label className="block text-sm text-gray-300 mb-1">Data de Nascimento *</label>
              <input
                type="date"
                value={enrollModal.dataNascimento}
                onChange={(e) => setEnrollModal(prev => ({ ...prev, dataNascimento: e.target.value }))}
                className="w-full bg-dark-lighter border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-accent/50 focus:outline-none"
              />
            </div>

            {/* CEP */}
            <div className="mb-5">
              <label className="block text-sm text-gray-300 mb-1">CEP *</label>
              <input
                type="text"
                value={formatCep(enrollModal.cep)}
                onChange={(e) => setEnrollModal(prev => ({ ...prev, cep: e.target.value }))}
                placeholder="00000-000"
                maxLength={9}
                className="w-full bg-dark-lighter border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-accent/50 focus:outline-none"
              />
            </div>

            {enrollModal.hasExistingData && (
              <p className="text-xs text-emerald-400 mb-3">✓ Dados pré-preenchidos do cadastro anterior</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setEnrollModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 px-4 py-2.5 border border-gray-600 text-gray-300 rounded-xl hover:bg-dark-lighter transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnroll}
                disabled={enrollModal.loading}
                className="flex-1 px-4 py-2.5 bg-teal-accent text-dark font-medium rounded-xl hover:bg-teal-400 transition-colors text-sm disabled:opacity-50"
              >
                {enrollModal.loading ? 'Matriculando...' : '✓ Confirmar Matrícula'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Unenroll Confirmation Modal */}
      {unenrollModal.isOpen && unenrollModal.interest && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4" onClick={() => setUnenrollModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">Desmatricular Aluno</h2>
              </div>
              <button onClick={() => setUnenrollModal(prev => ({ ...prev, isOpen: false }))} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-300 text-sm mb-2">
              Tem certeza que deseja desmatricular <span className="text-white font-medium">{unenrollModal.interest.aluno_nome}</span> do curso <span className="text-teal-accent">{unenrollModal.interest.curso_nome}</span>?
            </p>
            <p className="text-gray-500 text-xs mb-5">
              O aluno será removido da turma e movido para <span className={STATUS_CONFIG[unenrollModal.targetStatus].color}>{STATUS_CONFIG[unenrollModal.targetStatus].label}</span>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setUnenrollModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-xl hover:bg-dark-lighter transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleUnenrollConfirm}
                disabled={unenrollModal.loading}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-dark font-medium rounded-xl hover:bg-amber-400 transition-colors text-sm disabled:opacity-50"
              >
                {unenrollModal.loading ? 'Verificando...' : 'Sim, desmatricular'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Payments Confirmation Modal */}
      {deletePaymentsModal.isOpen && deletePaymentsModal.interest && createPortal(
        <div className="fixed inset-0 z-[10001] bg-black/60 flex items-center justify-center p-4" onClick={() => handleDeletePaymentsNo()}>
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <h2 className="text-lg font-semibold text-white">Deletar Pagamentos?</h2>
              </div>
              <button onClick={() => handleDeletePaymentsNo()} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-300 text-sm mb-2">
              <span className="text-white font-medium">{deletePaymentsModal.interest.aluno_nome}</span> tem <span className="text-red-400 font-bold">{deletePaymentsModal.paymentCount} pagamento(s)</span> no valor total de <span className="text-red-400 font-bold">{formatCurrency(deletePaymentsModal.paymentTotal)}</span> vinculados a esta turma.
            </p>
            <p className="text-gray-400 text-sm mb-5">
              Deseja deletar todos os pagamentos atrelados a esse aluno nesta turma?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeletePaymentsNo}
                disabled={deletePaymentsModal.loading}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-xl hover:bg-dark-lighter transition-colors text-sm"
              >
                Não, manter
              </button>
              <button
                onClick={handleDeletePaymentsYes}
                disabled={deletePaymentsModal.loading}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors text-sm disabled:opacity-50"
              >
                {deletePaymentsModal.loading ? 'Deletando...' : 'Sim, deletar tudo'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
