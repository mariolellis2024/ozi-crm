import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import { Filter, X, MessageCircle, ClipboardList, AlertTriangle, Upload, Loader2, RefreshCw, Plus, Trash2, Power, Link2, Zap } from 'lucide-react';
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
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
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
  sala_nome: string;
}

const PERIOD_LABELS: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  dia_inteiro: 'Dia Inteiro'
};

function periodLabel(p: string) {
  return PERIOD_LABELS[p] || p;
}

function formatDateShort(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  interested: { label: 'Interessados', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/30' },
  in_service: { label: 'Em atendimento', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10 border-cyan-500/30' },
  enrolled: { label: 'Matriculados', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/30' },
  completed: { label: 'Concluídos', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/30' },
  lost: { label: 'Perdidos', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/30' },
};

const COLUMNS = ['interested', 'in_service', 'enrolled', 'completed', 'lost'];

export function Pipeline() {
  const { selectedUnidadeId } = useUnidade();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [allTurmas, setAllTurmas] = useState<Turma[]>([]);
  const [selectedCurso, setSelectedCurso] = useState('');
  const [selectedUnidade, setSelectedUnidade] = useState(selectedUnidadeId || '');
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

  // Import modal state
  const [importModal, setImportModal] = useState<{
    isOpen: boolean;
    url: string;
    cursoId: string;
    unidadeId: string;
    step: 'form' | 'preview' | 'done';
    loading: boolean;
    leads: any[];
    newCount: number;
    dupCount: number;
    importedCount: number;
    skippedCount: number;
    activeTab: 'connections' | 'manual';
  }>({
    isOpen: false, url: '', cursoId: '', unidadeId: '',
    step: 'form', loading: false, leads: [], newCount: 0, dupCount: 0,
    importedCount: 0, skippedCount: 0, activeTab: 'connections'
  });

  // Facebook connections state
  const [fbConnections, setFbConnections] = useState<any[]>([]);
  const [fbForm, setFbForm] = useState({ nome: '', spreadsheet_url: '', curso_id: '', unidade_id: '', isOpen: false, editing: '' });
  const [fbSyncing, setFbSyncing] = useState<string | null>(null);
  const [fbLoading, setFbLoading] = useState(false);

  useEffect(() => {
    loadData();
    setSelectedUnidade(selectedUnidadeId || '');
  }, [selectedUnidadeId]);

  // New leads notification on page load
  useEffect(() => {
    if (interests.length === 0) return;
    const interestedCount = interests.filter(i => i.status === 'interested').length;
    const lastSeen = parseInt(localStorage.getItem('ozi_pipeline_last_interested_count') || '0', 10);
    const lastTime = localStorage.getItem('ozi_pipeline_last_visit');

    if (lastTime && interestedCount > lastSeen) {
      const newCount = interestedCount - lastSeen;
      toast.success(`🆕 ${newCount} novo${newCount !== 1 ? 's' : ''} lead${newCount !== 1 ? 's' : ''} desde sua última visita!`, { duration: 5000 });
    }

    localStorage.setItem('ozi_pipeline_last_interested_count', String(interestedCount));
    localStorage.setItem('ozi_pipeline_last_visit', new Date().toISOString());
  }, [interests]);

  // Update localStorage when interests change (user working)
  useEffect(() => {
    if (interests.length === 0) return;
    const interestedCount = interests.filter(i => i.status === 'interested').length;
    localStorage.setItem('ozi_pipeline_last_interested_count', String(interestedCount));
  }, [interests.length]);

  async function loadData() {
    try {
      const unidadeParam = selectedUnidadeId ? `?unidade_id=${selectedUnidadeId}` : '';
      const [cursosData, interestsData, turmasData, unidadesData] = await Promise.all([
        api.get('/api/cursos'),
        api.get(`/api/pipeline${unidadeParam}`),
        api.get(`/api/turmas${unidadeParam}`),
        api.get('/api/unidades')
      ]);
      setCursos(cursosData);
      setInterests(interestsData);
      setUnidades(unidadesData);
      // Map turma data: extract unidade_nome and enrolled_count from nested objects
      const mappedTurmas = turmasData.map((t: any) => ({
        ...t,
        unidade_nome: t.sala?.unidade_nome || t.unidade_nome || '',
        sala_nome: t.sala?.nome || '',
        enrolled_count: t.alunos_enrolled?.length ?? t.enrolled_count ?? 0,
      }));
      setAllTurmas(mappedTurmas);
    } catch (error) {
      console.error('Erro ao carregar pipeline:', error);
    }
  }

  async function handleImportPreview() {
    if (!importModal.url.trim()) {
      toast.error('Cole a URL da planilha');
      return;
    }
    setImportModal(prev => ({ ...prev, loading: true }));
    try {
      const data = await api.post('/api/import-leads/preview', { url: importModal.url });
      setImportModal(prev => ({
        ...prev,
        step: 'preview',
        leads: data.leads,
        newCount: data.new_count,
        dupCount: data.duplicate_count,
        loading: false
      }));
    } catch (error: any) {
      toast.error(error.message || 'Erro ao ler planilha');
      setImportModal(prev => ({ ...prev, loading: false }));
    }
  }

  async function handleImportExecute() {
    if (!importModal.cursoId || !importModal.unidadeId) {
      toast.error('Selecione o curso e a unidade');
      return;
    }
    setImportModal(prev => ({ ...prev, loading: true }));
    try {
      const data = await api.post('/api/import-leads/execute', {
        leads: importModal.leads,
        curso_id: importModal.cursoId,
        unidade_id: importModal.unidadeId
      });
      setImportModal(prev => ({
        ...prev,
        step: 'done',
        importedCount: data.imported,
        skippedCount: data.skipped,
        loading: false
      }));
      toast.success(`${data.imported} leads importados!`);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao importar');
      setImportModal(prev => ({ ...prev, loading: false }));
    }
  }

  function closeImportModal() {
    setImportModal({
      isOpen: false, url: '', cursoId: '', unidadeId: '',
      step: 'form', loading: false, leads: [], newCount: 0, dupCount: 0,
      importedCount: 0, skippedCount: 0, activeTab: 'connections'
    });
  }

  async function loadFbConnections() {
    setFbLoading(true);
    try {
      const data = await api.get('/api/fb-connections');
      setFbConnections(data);
    } catch {
      toast.error('Erro ao carregar conexões');
    } finally {
      setFbLoading(false);
    }
  }

  async function saveFbConnection() {
    const { nome, spreadsheet_url, curso_id, unidade_id, editing } = fbForm;
    if (!nome || !spreadsheet_url || !curso_id || !unidade_id) {
      toast.error('Preencha todos os campos');
      return;
    }
    try {
      if (editing) {
        await api.put(`/api/fb-connections/${editing}`, { nome, spreadsheet_url, curso_id, unidade_id });
        toast.success('Conexão atualizada');
      } else {
        await api.post('/api/fb-connections', { nome, spreadsheet_url, curso_id, unidade_id });
        toast.success('Conexão cadastrada');
      }
      setFbForm({ nome: '', spreadsheet_url: '', curso_id: '', unidade_id: '', isOpen: false, editing: '' });
      loadFbConnections();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar conexão');
    }
  }

  async function deleteFbConnection(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta conexão?')) return;
    try {
      await api.delete(`/api/fb-connections/${id}`);
      toast.success('Conexão excluída');
      loadFbConnections();
    } catch {
      toast.error('Erro ao excluir');
    }
  }

  async function toggleFbConnection(id: string, ativo: boolean) {
    try {
      await api.put(`/api/fb-connections/${id}`, { ativo: !ativo });
      toast.success(ativo ? 'Auto-sync desativado' : 'Auto-sync ativado');
      loadFbConnections();
    } catch {
      toast.error('Erro ao atualizar');
    }
  }



  function editFbConnection(conn: any) {
    setFbForm({
      nome: conn.nome,
      spreadsheet_url: conn.spreadsheet_url,
      curso_id: conn.curso_id,
      unidade_id: conn.unidade_id,
      isOpen: true,
      editing: conn.id,
    });
  }

  function formatTimeAgo(dateStr: string) {
    if (!dateStr) return 'Nunca';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Agora';
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  }

  async function openEnrollModal(interest: Interest) {
    // Find turmas for this curso
    const availableTurmas = allTurmas.filter(t => t.curso_id === interest.curso_id);

    if (availableTurmas.length === 0) {
      toast.error('Nenhuma turma aberta para este curso. Crie uma turma primeiro.');
      return;
    }

    // Fetch aluno data for pre-fill
    let email = '', genero = '', dataNascimento = '', cep = '', hasExistingData = false;
    try {
      const aluno = await api.get(`/api/alunos/${interest.aluno_id}`);
      email = aluno.email || '';
      // Normalize legacy gender values ('m' -> 'masculino', 'f' -> 'feminino')
      const rawGenero = (aluno.genero || '').toLowerCase();
      genero = rawGenero === 'm' ? 'masculino' : rawGenero === 'f' ? 'feminino' : rawGenero;
      dataNascimento = aluno.data_nascimento || '';
      cep = aluno.cep || '';
      hasExistingData = !!(email && genero && dataNascimento && cep);
    } catch { /* ignore */ }

    // Sort: student's unidade first, then by vacancies
    const sorted = [...availableTurmas].sort((a, b) => {
      // Student's unidade first
      if (interest.aluno_unidade_id) {
        const aMatch = (a as any).sala?.unidade_id === interest.aluno_unidade_id || a.unidade_nome === interest.unidade_nome;
        const bMatch = (b as any).sala?.unidade_id === interest.aluno_unidade_id || b.unidade_nome === interest.unidade_nome;
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
      }
      // Non-full turmas first
      const aFull = a.enrolled_count >= a.cadeiras ? 1 : 0;
      const bFull = b.enrolled_count >= b.cadeiras ? 1 : 0;
      return aFull - bFull;
    });

    // Non-full turmas
    const nonFullTurmas = sorted.filter(t => t.enrolled_count < t.cadeiras);

    // If student has all data AND only 1 non-full turma, skip the form
    if (hasExistingData && nonFullTurmas.length === 1) {
      const turma = nonFullTurmas[0];
      const confirmed = window.confirm(
        `Matricular ${interest.aluno_nome} na turma:\n\n` +
        `📚 ${turma.name}\n` +
        `📍 ${turma.unidade_nome}${turma.sala_nome ? ' • ' + turma.sala_nome : ''}\n` +
        `🕐 ${periodLabel(turma.period)} • ${formatDateShort(turma.start_date)} a ${formatDateShort(turma.end_date)}\n` +
        `👥 ${turma.enrolled_count}/${turma.cadeiras} vagas\n\n` +
        `Confirmar matrícula?`
      );
      if (confirmed) {
        try {
          await api.post('/api/interests/enroll', {
            aluno_id: interest.aluno_id,
            curso_id: interest.curso_id,
            turma_id: turma.id,
            email,
            genero,
            data_nascimento: dataNascimento ? new Date(dataNascimento).toISOString().split('T')[0] : '',
            cep: (cep || '').replace(/\D/g, '')
          });
          toast.success(`${interest.aluno_nome} matriculado(a) com sucesso!`);
          loadData();
        } catch (error: any) {
          toast.error(error.message || 'Erro ao matricular');
        }
      }
      return;
    }

    setEnrollModal({
      isOpen: true,
      interest,
      turmas: sorted,
      selectedTurmaId: nonFullTurmas.length === 1 ? nonFullTurmas[0].id : '',
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

    // If student is enrolled and moving to interested, in_service, or lost, confirm unenrollment
    if (interest.status === 'enrolled' && (newStatus === 'interested' || newStatus === 'in_service' || newStatus === 'lost')) {
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

  const filtered = interests.filter(i => {
    if (selectedCurso && i.curso_id !== selectedCurso) return false;
    if (selectedUnidade && i.aluno_unidade_id !== selectedUnidade) return false;
    return true;
  });

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
          <button
            onClick={() => { setImportModal(prev => ({ ...prev, isOpen: true })); loadFbConnections(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors font-medium text-sm"
          >
            <Upload className="h-4 w-4" />
            Importar Leads
          </button>
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
          <select
            value={selectedUnidade}
            onChange={(e) => setSelectedUnidade(e.target.value)}
            disabled={!!selectedUnidadeId}
            className={`bg-dark-card text-white px-4 py-2 rounded-xl border border-dark-lighter focus:ring-2 focus:ring-teal-accent outline-none text-sm ${selectedUnidadeId ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <option value="">Todas as unidades</option>
            {unidades.map(u => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
          <span className="text-gray-500 text-sm">{filtered.length} registros</span>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-5 gap-4 min-h-[60vh]">
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
                    <span className={`text-xs px-2 py-1 rounded-full border ${cfg.bgColor} ${cfg.color} font-bold`}>
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
                        {(interest.utm_source || interest.utm_campaign) && (
                          <p className="text-[10px] mt-0.5">
                            <span className="px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20" title={[
                              interest.utm_source && `Source: ${interest.utm_source}`,
                              interest.utm_medium && `Medium: ${interest.utm_medium}`,
                              interest.utm_campaign && `Campaign: ${interest.utm_campaign}`,
                              interest.utm_content && `Content: ${interest.utm_content}`,
                              interest.utm_term && `Term: ${interest.utm_term}`,
                            ].filter(Boolean).join(' · ')}>
                              📢 {[interest.utm_source, interest.utm_medium, interest.utm_campaign].filter(Boolean).join(' / ')}
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
              <label className="block text-sm text-gray-300 mb-2">Turma *</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {enrollModal.turmas.map(t => {
                  const isFull = t.enrolled_count >= t.cadeiras;
                  const isAlmostFull = !isFull && t.enrolled_count >= t.cadeiras * 0.8;
                  const isSelected = enrollModal.selectedTurmaId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={isFull}
                      onClick={() => setEnrollModal(prev => ({ ...prev, selectedTurmaId: t.id }))}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        isFull
                          ? 'opacity-40 cursor-not-allowed border-gray-700 bg-dark-lighter'
                          : isSelected
                          ? 'border-teal-accent bg-teal-accent/10'
                          : 'border-gray-700 bg-dark-lighter hover:border-gray-500'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white text-sm font-medium">{t.name}</p>
                          <p className="text-gray-400 text-xs mt-0.5">
                            📍 {t.unidade_nome || 'Sem unidade'}{t.sala_nome ? ` • ${t.sala_nome}` : ''}
                          </p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            🕐 {periodLabel(t.period)} • {formatDateShort(t.start_date)} a {formatDateShort(t.end_date)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <span className={`text-xs font-medium ${
                            isFull ? 'text-red-400' : isAlmostFull ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {t.enrolled_count}/{t.cadeiras}
                          </span>
                          <p className="text-[10px] text-gray-500">
                            {isFull ? 'Lotada' : isAlmostFull ? 'Últimas vagas' : 'vagas'}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
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

      {/* Import Leads Modal */}
      {importModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4" onClick={closeImportModal}>
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-sky-400" />
                <h2 className="text-lg font-semibold text-white">Facebook Leads</h2>
              </div>
              <button onClick={closeImportModal} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-dark-lighter rounded-xl p-1">
              <button
                onClick={() => setImportModal(prev => ({ ...prev, activeTab: 'connections' }))}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  importModal.activeTab === 'connections'
                    ? 'bg-sky-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Link2 className="h-3.5 w-3.5 inline mr-1.5" />
                Conexões
              </button>
              <button
                onClick={() => setImportModal(prev => ({ ...prev, activeTab: 'manual' }))}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  importModal.activeTab === 'manual'
                    ? 'bg-sky-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Upload className="h-3.5 w-3.5 inline mr-1.5" />
                Import Manual
              </button>
            </div>

            {/* ========== CONNECTIONS TAB ========== */}
            {importModal.activeTab === 'connections' && (
              <div className="flex-1 overflow-y-auto space-y-3">
                {/* New Connection Form */}
                {fbForm.isOpen ? (
                  <div className="p-4 rounded-xl border-2 border-sky-500/30 bg-sky-500/5 space-y-3">
                    <h3 className="text-sm font-semibold text-sky-400">{fbForm.editing ? 'Editar Conexão' : 'Nova Conexão'}</h3>
                    <input type="text" value={fbForm.nome} onChange={e => setFbForm(prev => ({ ...prev, nome: e.target.value }))} placeholder="Nome da conexão (ex: After Effects - Brasília)" className="w-full bg-dark-lighter border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                    <input type="url" value={fbForm.spreadsheet_url} onChange={e => setFbForm(prev => ({ ...prev, spreadsheet_url: e.target.value }))} placeholder="https://docs.google.com/spreadsheets/d/..." className="w-full bg-dark-lighter border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/50 focus:outline-none" />
                    <div className="grid grid-cols-2 gap-3">
                      <select value={fbForm.curso_id} onChange={e => setFbForm(prev => ({ ...prev, curso_id: e.target.value }))} className="w-full bg-dark-lighter border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/50 focus:outline-none">
                        <option value="">Curso *</option>
                        {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                      <select value={fbForm.unidade_id} onChange={e => setFbForm(prev => ({ ...prev, unidade_id: e.target.value }))} className="w-full bg-dark-lighter border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/50 focus:outline-none">
                        <option value="">Unidade *</option>
                        {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setFbForm({ nome: '', spreadsheet_url: '', curso_id: '', unidade_id: '', isOpen: false, editing: '' })} className="flex-1 px-3 py-2 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-dark-lighter transition-colors">Cancelar</button>
                      <button onClick={saveFbConnection} className="flex-1 px-3 py-2 bg-sky-500 text-white font-medium rounded-lg text-sm hover:bg-sky-600 transition-colors">{fbForm.editing ? 'Salvar' : 'Cadastrar'}</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setFbForm({ nome: '', spreadsheet_url: '', curso_id: '', unidade_id: '', isOpen: true, editing: '' })} className="w-full px-4 py-3 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 hover:text-sky-400 hover:border-sky-500/50 transition-all text-sm flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Conexão
                  </button>
                )}

                {/* Connections List */}
                {fbLoading ? (
                  <div className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin text-sky-400 mx-auto" /><p className="text-gray-500 text-sm mt-2">Carregando...</p></div>
                ) : fbConnections.length === 0 && !fbForm.isOpen ? (
                  <div className="text-center py-8">
                    <Link2 className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Nenhuma conexão cadastrada</p>
                    <p className="text-gray-600 text-xs mt-1">Cadastre uma planilha do Google Sheets para sincronizar leads automaticamente</p>
                  </div>
                ) : (
                  fbConnections.map((conn: any) => (
                    <div key={conn.id} className={`p-4 rounded-xl border transition-all ${conn.ativo ? 'border-gray-700 bg-dark-lighter' : 'border-gray-800 bg-dark-lighter/50 opacity-60'}`}>
                      {/* Preview mode for this connection */}
                      {importModal.step === 'preview' && importModal.cursoId === conn.id ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-white font-medium text-sm">{conn.nome}</h4>
                            <button onClick={() => setImportModal(prev => ({ ...prev, step: 'form', leads: [], cursoId: '', unidadeId: '' }))} className="text-gray-400 hover:text-white text-xs">✕ Fechar</button>
                          </div>

                          {importModal.newCount === 0 ? (
                            <div className="text-center py-6">
                              <div className="text-3xl mb-2">✅</div>
                              <p className="text-white font-medium text-sm">Tudo sincronizado!</p>
                              <p className="text-gray-500 text-xs mt-1">Nenhum lead novo na planilha. {importModal.dupCount} já importado{importModal.dupCount !== 1 ? 's' : ''}.</p>
                              <button onClick={() => setImportModal(prev => ({ ...prev, step: 'form', leads: [], cursoId: '', unidadeId: '' }))} className="mt-3 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-dark-card transition-colors">
                                OK
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
                                <div className="text-lg font-bold text-emerald-400">{importModal.newCount}</div>
                                <div className="text-[10px] text-emerald-400/70">novo{importModal.newCount !== 1 ? 's' : ''} lead{importModal.newCount !== 1 ? 's' : ''}</div>
                              </div>
                              <div className="max-h-48 overflow-y-auto rounded-lg border border-dark-lighter">
                                <table className="w-full text-xs">
                                  <thead className="bg-dark-card sticky top-0"><tr><th className="text-left px-2 py-1.5 text-gray-400 font-medium">Nome</th><th className="text-left px-2 py-1.5 text-gray-400 font-medium">WhatsApp</th><th className="text-left px-2 py-1.5 text-gray-400 font-medium">Campanha</th></tr></thead>
                                  <tbody className="divide-y divide-gray-800">
                                    {importModal.leads.filter((l: any) => !l.is_duplicate).map((lead: any, i: number) => (
                                      <tr key={i}>
                                        <td className="px-2 py-1.5 text-white">{lead.nome}</td>
                                        <td className="px-2 py-1.5 text-gray-300">{formatPhone(lead.whatsapp)}</td>
                                        <td className="px-2 py-1.5"><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">{lead.campaign_name || '—'}</span></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => setImportModal(prev => ({ ...prev, step: 'form', leads: [], cursoId: '', unidadeId: '' }))} className="flex-1 px-3 py-2 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-dark-card transition-colors">Cancelar</button>
                                <button
                                  onClick={async () => {
                                    setImportModal(prev => ({ ...prev, loading: true }));
                                    try {
                                      const data = await api.post('/api/import-leads/execute', { leads: importModal.leads, curso_id: conn.curso_id, unidade_id: conn.unidade_id });
                                      toast.success(`${data.imported} lead${data.imported !== 1 ? 's' : ''} importado${data.imported !== 1 ? 's' : ''}!`);
                                      setImportModal(prev => ({ ...prev, step: 'form', leads: [], cursoId: '', unidadeId: '', loading: false }));
                                      loadFbConnections(); loadData();
                                    } catch (error: any) { toast.error(error.message || 'Erro ao importar'); setImportModal(prev => ({ ...prev, loading: false })); }
                                  }}
                                  disabled={importModal.loading}
                                  className="flex-1 px-3 py-2 bg-emerald-500 text-white font-medium rounded-lg text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                                >
                                  {importModal.loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importando...</> : `✓ Importar ${importModal.newCount} lead${importModal.newCount !== 1 ? 's' : ''}`}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="text-white font-medium text-sm flex items-center gap-1.5">
                                {conn.ativo ? <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse inline-block" /> : <span className="h-2 w-2 rounded-full bg-gray-600 inline-block" />}
                                {conn.nome}
                              </h4>
                              <p className="text-gray-500 text-xs mt-0.5">📚 {conn.curso_nome} • 📍 {conn.unidade_nome}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={async () => {
                                  setFbSyncing(conn.id);
                                  try {
                                    const data = await api.post('/api/import-leads/preview', { url: conn.spreadsheet_url });
                                    setImportModal(prev => ({ ...prev, step: 'preview', leads: data.leads, newCount: data.new_count, dupCount: data.duplicate_count, cursoId: conn.id, unidadeId: conn.unidade_id }));
                                  } catch (error: any) { toast.error(error.message || 'Erro ao buscar planilha'); }
                                  finally { setFbSyncing(null); }
                                }}
                                disabled={fbSyncing === conn.id}
                                className="p-1.5 rounded-lg text-sky-400 hover:bg-sky-500/10 transition-colors disabled:opacity-50" title="Importar Agora"
                              >
                                {fbSyncing === conn.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                              </button>
                              <button onClick={() => toggleFbConnection(conn.id, conn.ativo)} className={`p-1.5 rounded-lg transition-colors ${conn.ativo ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-gray-500 hover:bg-gray-600/10'}`} title={conn.ativo ? 'Desativar auto-sync' : 'Ativar auto-sync'}>
                                <Power className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => editFbConnection(conn)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-600/10 transition-colors" title="Editar">
                                <ClipboardList className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => deleteFbConnection(conn.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors" title="Excluir">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[10px]">
                            <span className="text-gray-500">🔄 Última sync: {formatTimeAgo(conn.last_sync_at)}</span>
                            {conn.last_sync_count > 0 && <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">+{conn.last_sync_count} leads</span>}
                            {conn.last_sync_error && <span className="px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20" title={conn.last_sync_error}>⚠ Erro</span>}
                            {conn.ativo && <span className="px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">⚡ Auto-sync 30min</span>}
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ========== MANUAL IMPORT TAB ========== */}
            {importModal.activeTab === 'manual' && (
              <>
              {importModal.step === 'form' && (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">
                  Cole o link público da planilha Google Sheets com os leads exportados do Facebook Instant Forms.
                </p>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">URL da Planilha *</label>
                  <input
                    type="url"
                    value={importModal.url}
                    onChange={e => setImportModal(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full bg-dark-lighter border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500/50 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Curso *</label>
                    <select
                      value={importModal.cursoId}
                      onChange={e => setImportModal(prev => ({ ...prev, cursoId: e.target.value }))}
                      className="w-full bg-dark-lighter border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500/50 focus:outline-none"
                    >
                      <option value="">Selecione o curso</option>
                      {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Unidade *</label>
                    <select
                      value={importModal.unidadeId}
                      onChange={e => setImportModal(prev => ({ ...prev, unidadeId: e.target.value }))}
                      className="w-full bg-dark-lighter border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500/50 focus:outline-none"
                    >
                      <option value="">Selecione a unidade</option>
                      {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleImportPreview}
                  disabled={importModal.loading || !importModal.url.trim()}
                  className="w-full px-4 py-2.5 bg-sky-500 text-white font-medium rounded-xl hover:bg-sky-600 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importModal.loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Buscando dados...</> : 'Buscar Dados da Planilha'}
                </button>
              </div>
              )}

            {importModal.step === 'preview' && (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Summary */}
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <div className="text-2xl font-bold text-emerald-400">{importModal.newCount}</div>
                    <div className="text-xs text-emerald-400/70">Novos leads</div>
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                    <div className="text-2xl font-bold text-amber-400">{importModal.dupCount}</div>
                    <div className="text-xs text-amber-400/70">Já importados</div>
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-center">
                    <div className="text-2xl font-bold text-sky-400">{importModal.leads.length}</div>
                    <div className="text-xs text-sky-400/70">Total na planilha</div>
                  </div>
                </div>

                {/* Leads table */}
                <div className="flex-1 overflow-y-auto rounded-xl border border-dark-lighter mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-dark-lighter sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-gray-400 font-medium">Nome</th>
                        <th className="text-left px-3 py-2 text-gray-400 font-medium">WhatsApp</th>
                        <th className="text-left px-3 py-2 text-gray-400 font-medium">Campanha</th>
                        <th className="text-left px-3 py-2 text-gray-400 font-medium">Plataforma</th>
                        <th className="text-center px-3 py-2 text-gray-400 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {importModal.leads.map((lead, i) => (
                        <tr key={i} className={lead.is_duplicate ? 'opacity-40' : ''}>
                          <td className="px-3 py-2 text-white">{lead.nome}</td>
                          <td className="px-3 py-2 text-gray-300">{formatPhone(lead.whatsapp)}</td>
                          <td className="px-3 py-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              {lead.campaign_name || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`text-xs ${lead.platform === 'instagram' ? 'text-pink-400' : 'text-blue-400'}`}>
                              {lead.platform}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {lead.is_duplicate ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Duplicado</span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Novo</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setImportModal(prev => ({ ...prev, step: 'form', leads: [] }))}
                    className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-xl hover:bg-dark-lighter transition-colors text-sm"
                  >
                    ← Voltar
                  </button>
                  <button
                    onClick={handleImportExecute}
                    disabled={importModal.loading || importModal.newCount === 0 || !importModal.cursoId || !importModal.unidadeId}
                    className="flex-1 px-4 py-2.5 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {importModal.loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</> : `Importar ${importModal.newCount} lead${importModal.newCount !== 1 ? 's' : ''}`}
                  </button>
                </div>

                {(!importModal.cursoId || !importModal.unidadeId) && (
                  <p className="text-amber-400 text-xs text-center mt-2">⚠ Selecione o curso e a unidade antes de importar (volte ao passo anterior)</p>
                )}
              </div>
            )}

            {importModal.step === 'done' && (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-bold text-white mb-2">Importação concluída!</h3>
                <div className="flex justify-center gap-6 mb-6">
                  <div>
                    <div className="text-2xl font-bold text-emerald-400">{importModal.importedCount}</div>
                    <div className="text-xs text-gray-400">Importados</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-400">{importModal.skippedCount}</div>
                    <div className="text-xs text-gray-400">Ignorados</div>
                  </div>
                </div>
                <button
                  onClick={closeImportModal}
                  className="px-6 py-2.5 bg-teal-accent text-dark font-medium rounded-xl hover:bg-teal-400 transition-colors text-sm"
                >
                  Fechar
                </button>
              </div>
            )}
            </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
