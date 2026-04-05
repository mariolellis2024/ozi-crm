import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2, Users, Calendar, Clock, TrendingUp, BookOpen, UserCheck, AlertCircle, MapPin, X, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { formatCurrency } from '../utils/format';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ModalTurma } from '../components/ModalTurma';
import { useUnidade } from '../contexts/UnidadeContext';
import { ModalAlunosInteressados } from '../components/ModalAlunosInteressados';
import { ModalAlunosMatriculados } from '../components/ModalAlunosMatriculados';
import { ModalComissoesTurma } from '../components/ModalComissoesTurma';
import { CalendarOcupacaoSalas } from '../components/CalendarOcupacaoSalas';

type Period = 'manha' | 'tarde' | 'noite';

interface ProfessorAssignment {
  professor_id: string;
  hours: number;
}

interface Turma {
  id: string;
  name: string;
  curso_id: string;
  sala_id: string;
  cadeiras: number;
  potencial_faturamento: number;
  period: Period;
  start_date: string;
  end_date: string;
  imposto: number;
  investimento_anuncios: number;
  investimento_anuncios_realizado: number;
  days_of_week?: number[];
  created_at: string;
  curso?: {
    id: string;
    nome: string;
    preco: number;
    carga_horaria: number;
  };
  sala?: {
    id: string;
    nome: string;
    cadeiras: number;
    unidade_id?: string;
    unidade_nome?: string;
  };
  professores?: Array<{
    id: string;
    professor_id: string;
    hours: number;
    professor: {
      id: string;
      nome: string;
      valor_hora: number;
    };
  }>;
  alunos_enrolled?: Array<{
    id: string;
    nome: string;
  }>;
}

interface Curso {
  id: string;
  nome: string;
  preco: number;
  carga_horaria: number;
}

interface Sala {
  id: string;
  nome: string;
  cadeiras: number;
}

interface Professor {
  id: string;
  nome: string;
  valor_hora: number;
  unidade_id?: string;
}

export function Turmas() {
  const { selectedUnidadeId } = useUnidade();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alunosInteressadosModal, setAlunosInteressadosModal] = useState({
    isOpen: false,
    turmaId: '',
    cursoId: '',
    turmaPeriod: '' as Period,
    cursoNome: '',
    cursoPreco: 0,
    unidadeId: ''
  });
  const [alunosMatriculadosModal, setAlunosMatriculadosModal] = useState({
    isOpen: false,
    turmaId: '',
    cursoId: '',
    cursoNome: '',
    cursoPreco: 0
  });
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    alunoId: '',
    alunoNome: '',
    cursoId: '',
    cursoPreco: 0,
    turmaId: '',
    totalParcelas: '1',
    valorTotal: '',
    firstDueDate: new Date().toISOString().split('T')[0]
  });
  const [comissoesTurmaModal, setComissoesTurmaModal] = useState({
    isOpen: false,
    turmaId: '',
    cursoNome: '',
    cursoPreco: 0,
    cadeiras: 0
  });
  const [formData, setFormData] = useState({
    name: '',
    curso_id: '',
    sala_id: '',
    cadeiras: '',
    period: 'manha' as Period,
    start_date: '',
    end_date: '',
    imposto: '',
    investimento_anuncios: '',
    investimento_anuncios_realizado: '',
    professores: [] as ProfessorAssignment[],
    days_of_week: [] as number[],
    horario_inicio: '',
    horario_fim: '',
    local_aula: '',
    endereco_aula: '',
    carga_horaria_total: '',
    acompanhamento_inicio: '',
    acompanhamento_fim: '',
    sessoes_online: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    turmaId: '',
    turmaNome: ''
  });
  const [suggestions, setSuggestions] = useState<Array<{
    cursoId: string;
    cursoNome: string;
    melhorPeriodo: Period;
    totalInteressados: number;
  }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedUnidadeId]);

  async function loadData() {
    try {
      const unidadeParam = selectedUnidadeId ? `?unidade_id=${selectedUnidadeId}` : '';
      const [turmasData, cursosData, salasData, professoresData] = await Promise.all([
        api.get(`/api/turmas${unidadeParam}`),
        api.get('/api/cursos'),
        api.get(`/api/salas${unidadeParam}`),
        api.get(`/api/professores${unidadeParam}`)
      ]);

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const sortedTurmas = turmasData.sort((a: any, b: any) => {
        const dateA = new Date(a.start_date + 'T00:00:00');
        const dateB = new Date(b.start_date + 'T00:00:00');
        
        const aIsFuture = dateA >= now;
        const bIsFuture = dateB >= now;

        if (aIsFuture && !bIsFuture) return -1;
        if (!aIsFuture && bIsFuture) return 1;
        
        if (aIsFuture && bIsFuture) {
          return dateA.getTime() - dateB.getTime();
        } else {
          return dateB.getTime() - dateA.getTime();
        }
      });

      setTurmas(sortedTurmas);
      setCursos(cursosData);
      setSalas(salasData);
      setProfessores(professoresData);

      // Generate suggestions
      await generateSuggestions();
    } catch (error: any) {
      console.error('Erro detalhado ao carregar dados:', error);
      toast.error(`Erro ao carregar dados: ${error.message || 'Erro desconhecido'}`);
    }
  }

  async function generateSuggestions() {
    try {
      const data = await api.get('/api/turmas/suggestions');
      setSuggestions(data || []);
    } catch (error) {
      console.error('Erro detalhado ao gerar sugestões:', error);
    }
  }

  async function checkConflicts(turmaData: any, editingId?: string): Promise<boolean> {
    try {
      const normalizeDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        date.setHours(0, 0, 0, 0);
        return date;
      };

      const newStartDate = normalizeDate(turmaData.start_date);
      const newEndDate = normalizeDate(turmaData.end_date);
      const newPeriod = turmaData.period;
      const newSalaId = turmaData.sala_id;
      const newDaysOfWeek = turmaData.days_of_week || [];

      const existingTurmas = await api.get('/api/turmas');
      const filteredTurmas = editingId 
        ? existingTurmas.filter((t: any) => t.id !== editingId)
        : existingTurmas;

      // Verificação de conflitos de sala
      if (newSalaId) {
        for (const turma of filteredTurmas) {
          if (turma.sala_id === newSalaId && turma.period === newPeriod) {
            const existingStartDate = normalizeDate(turma.start_date);
            const existingEndDate = normalizeDate(turma.end_date);

            if (newStartDate <= existingEndDate && newEndDate >= existingStartDate) {
              const existingDaysOfWeek = turma.days_of_week || [];
              
              if (newDaysOfWeek.length === 0 || existingDaysOfWeek.length === 0 || 
                  newDaysOfWeek.some((day: number) => existingDaysOfWeek.includes(day))) {
                return true;
              }
            }
          }
        }
      }

      // Verificação de conflitos de professor
      if (turmaData.professores && turmaData.professores.length > 0) {
        for (const newProf of turmaData.professores) {
          if (!newProf.professor_id) continue;

          for (const turma of filteredTurmas) {
            if (turma.period === newPeriod) {
              const existingStartDate = normalizeDate(turma.start_date);
              const existingEndDate = normalizeDate(turma.end_date);

              if (newStartDate <= existingEndDate && newEndDate >= existingStartDate) {
                const professorConflict = turma.professores?.find(
                  (tp: any) => tp.professor_id === newProf.professor_id
                );

                if (professorConflict) {
                  const existingDaysOfWeek = turma.days_of_week || [];
                  
                  if (newDaysOfWeek.length === 0 || existingDaysOfWeek.length === 0 || 
                      newDaysOfWeek.some((day: number) => existingDaysOfWeek.includes(day))) {
                    return true;
                  }
                }
              }
            }
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Erro detalhado ao verificar conflitos:', error);
      throw error;
    }
  }

  async function checkConflictsDetailed(newTurmaData: any, editingId?: string): Promise<string> {
    // Normaliza a data para o início do dia no fuso horário local
    const normalizeDate = (dateStr: string) => {
      const date = new Date(dateStr + 'T00:00:00'); // Cria a data no fuso horário local
      date.setHours(0, 0, 0, 0); // Garante que seja exatamente meia-noite local
      return date;
    };

    const newStartDate = normalizeDate(newTurmaData.start_date);
    const newEndDate = normalizeDate(newTurmaData.end_date);
    const newPeriod = newTurmaData.period;
    const newSalaId = newTurmaData.sala_id;
    const newDaysOfWeek = newTurmaData.days_of_week || [];

    const getDayName = (dayNum: number): string => {
      const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      // Ajusta o índice: dayNum 1 = Segunda (índice 1), dayNum 7 = Domingo (índice 0)
      return days[dayNum === 7 ? 0 : dayNum] || `Dia ${dayNum}`;
    };

    const getPeriodName = (period: string): string => {
      switch (period) {
        case 'manha': return 'Manhã';
        case 'tarde': return 'Tarde';
        case 'noite': return 'Noite';
        default: return period;
      }
    };

    const formatDateBR = (date: Date): string => {
      return date.toLocaleDateString('pt-BR');
    };

    const existingTurmas = await api.get('/api/turmas');
    const filteredTurmas = editingId 
      ? existingTurmas.filter((t: any) => t.id !== editingId)
      : existingTurmas;

    // Verificação de conflitos de sala
    if (newSalaId) {
      for (const turma of filteredTurmas) {
        if (turma.sala_id === newSalaId && turma.period === newPeriod) {
          const existingStartDate = normalizeDate(turma.start_date);
          const existingEndDate = normalizeDate(turma.end_date);

          // Verifica sobreposição de datas
          if (newStartDate <= existingEndDate && newEndDate >= existingStartDate) {
            const existingDaysOfWeek = turma.days_of_week || [];
            
            let conflictingDays: number[] = [];
            if (newDaysOfWeek.length === 0 && existingDaysOfWeek.length === 0) {
              // Ambas as turmas são flexíveis, conflito em todos os dias
              return `❌ CONFLITO DE SALA: A sala "${turma.sala?.nome}" já está ocupada pela turma "${turma.name}" no período da ${getPeriodName(turma.period)} (${formatDateBR(existingStartDate)} - ${formatDateBR(existingEndDate)}).`;
            } else if (newDaysOfWeek.length === 0) {
              // Nova turma flexível, conflita com os dias específicos da turma existente
              conflictingDays = existingDaysOfWeek;
            } else if (existingDaysOfWeek.length === 0) {
              // Turma existente flexível, conflita com os dias específicos da nova turma
              conflictingDays = newDaysOfWeek;
            } else {
              // Ambas têm dias específicos, encontra os dias em comum
              conflictingDays = newDaysOfWeek.filter(day => existingDaysOfWeek.includes(day));
            }

            if (conflictingDays.length > 0) {
              const daysText = conflictingDays.map(getDayName).join(', ');
              return `❌ CONFLITO DE SALA: A sala "${turma.sala?.nome}" já está ocupada pela turma "${turma.name}" no período da ${getPeriodName(turma.period)} nos dias: ${daysText} (${formatDateBR(existingStartDate)} - ${formatDateBR(existingEndDate)}).`;
            }
          }
        }
      }
    }

    // Verificação de conflitos de professor
    if (newTurmaData.professores && newTurmaData.professores.length > 0) {
      for (const newProf of newTurmaData.professores) {
        if (!newProf.professor_id) continue;

        for (const turma of filteredTurmas) {
          if (turma.period === newPeriod) {
            const existingStartDate = normalizeDate(turma.start_date);
            const existingEndDate = normalizeDate(turma.end_date);

            // Verifica sobreposição de datas
            if (newStartDate <= existingEndDate && newEndDate >= existingStartDate) {
              // Verifica se este professor está atribuído a esta turma
              const professorConflict = turma.professores?.find(
                (tp: any) => tp.professor_id === newProf.professor_id
              );

              if (professorConflict) {
                const existingDaysOfWeek = turma.days_of_week || [];
                
                let conflictingDays: number[] = [];
                if (newDaysOfWeek.length === 0 && existingDaysOfWeek.length === 0) {
                  return `👨‍🏫 CONFLITO DE PROFESSOR: O professor "${professorConflict.professor?.nome}" já tem compromisso na turma "${turma.name}" (${turma.sala?.nome}) no período da ${getPeriodName(turma.period)} (${formatDateBR(existingStartDate)} - ${formatDateBR(existingEndDate)}).`;
                } else if (newDaysOfWeek.length === 0) {
                  conflictingDays = existingDaysOfWeek;
                } else if (existingDaysOfWeek.length === 0) {
                  conflictingDays = newDaysOfWeek;
                } else {
                  conflictingDays = newDaysOfWeek.filter(day => existingDaysOfWeek.includes(day));
                }

                if (conflictingDays.length > 0) {
                  const daysText = conflictingDays.map(getDayName).join(', ');
                  return `👨‍🏫 CONFLITO DE PROFESSOR: O professor "${professorConflict.professor?.nome}" já tem compromisso na turma "${turma.name}" (${turma.sala?.nome}) no período da ${getPeriodName(turma.period)} nos dias: ${daysText} (${formatDateBR(existingStartDate)} - ${formatDateBR(existingEndDate)}).`;
                }
              }
            }
          }
        }
      }
    }

    // Se chegou até aqui, não há conflitos
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const curso = cursos.find(c => c.id === formData.curso_id);
      if (!curso) {
        toast.error('Curso não encontrado');
        return;
      }

      // Ensure empty strings are converted to null for UUID fields
      const turmaData = {
        name: formData.name,
        curso_id: formData.curso_id,
        sala_id: formData.sala_id || null,
        cadeiras: Number(formData.cadeiras),
        period: formData.period,
        start_date: formData.start_date,
        end_date: formData.end_date,
        potencial_faturamento: curso.preco * Number(formData.cadeiras),
        imposto: Number(formData.imposto),
        investimento_anuncios: Number(formData.investimento_anuncios) || 0,
        investimento_anuncios_realizado: Number(formData.investimento_anuncios_realizado) || 0,
        days_of_week: formData.days_of_week,
        horario_inicio: formData.horario_inicio || null,
        horario_fim: formData.horario_fim || null,
        local_aula: formData.local_aula || null,
        endereco_aula: formData.endereco_aula || null,
        carga_horaria_total: formData.carga_horaria_total ? Number(formData.carga_horaria_total) : null,
        acompanhamento_inicio: formData.acompanhamento_inicio || null,
        acompanhamento_fim: formData.acompanhamento_fim || null,
        sessoes_online: formData.sessoes_online || null
      };

      // Check for conflicts
      // Verifica conflitos diretamente com mensagem detalhada
      const conflictMessage = await checkConflictsDetailed(turmaData, editingId || undefined);
      
      if (conflictMessage) {
        // Se há uma mensagem de conflito, exibe e interrompe
        toast.error(conflictMessage);
        return;
      }
      
      // Se chegou aqui, não há conflitos - prossegue com a criação/atualização

      let turmaId: string;

      if (editingId) {
        await api.put(`/api/turmas/${editingId}`, {
          ...turmaData,
          professores: formData.professores
            .filter((prof: any) => prof.professor_id && prof.professor_id.trim() !== '')
            .map((prof: any) => ({
              professor_id: prof.professor_id,
              hours: prof.hours
            }))
        });
        turmaId = editingId;
        toast.success('Turma atualizada com sucesso!');
      } else {
        const result = await api.post('/api/turmas', {
          ...turmaData,
          professores: formData.professores
            .filter((prof: any) => prof.professor_id && prof.professor_id.trim() !== '')
            .map((prof: any) => ({
              professor_id: prof.professor_id,
              hours: prof.hours
            }))
        });
        turmaId = result.id;
        toast.success('Turma criada com sucesso!');
      }

      setIsModalOpen(false);
      setFormData({
        name: '',
        curso_id: '',
        sala_id: '',
        cadeiras: '',
        period: 'manha',
        start_date: '',
        end_date: '',
        imposto: '',
        investimento_anuncios: '',
        investimento_anuncios_realizado: '',
        professores: [],
        days_of_week: [],
        horario_inicio: '',
        horario_fim: '',
        local_aula: '',
        endereco_aula: '',
        carga_horaria_total: '',
        acompanhamento_inicio: '',
        acompanhamento_fim: '',
        sessoes_online: ''
      });
      setEditingId(null);
      loadData();
    } catch (error: any) {
      console.error('Erro detalhado ao salvar turma:', error);
      toast.error(`Erro ao salvar turma: ${error.message || 'Erro desconhecido'}`);
    }
  }

  async function handleDelete(id: string) {
    const turma = turmas.find(t => t.id === id);
    if (!turma) return;

    setConfirmModal({
      isOpen: true,
      turmaId: id,
      turmaNome: turma.name
    });
  }

  async function handleConfirmDelete() {
    try {
      // The server handles unenrolling students before deleting
      const result = await api.delete(`/api/turmas/${confirmModal.turmaId}`);
      
      if (result.unenrolled_count && result.unenrolled_count > 0) {
        toast.success(`Turma excluída com sucesso! ${result.unenrolled_count} aluno${result.unenrolled_count > 1 ? 's' : ''} retornado${result.unenrolled_count > 1 ? 's' : ''} para interessado${result.unenrolled_count > 1 ? 's' : ''}.`);
      } else {
        toast.success('Turma excluída com sucesso!');
      }
      
      loadData();
    } catch (error: any) {
      console.error('Erro detalhado ao excluir turma:', error);
      toast.error(`Erro ao excluir turma: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setConfirmModal({ isOpen: false, turmaId: '', turmaNome: '' });
    }
  }

  function handleCancelDelete() {
    setConfirmModal({ isOpen: false, turmaId: '', turmaNome: '' });
  }

  function handleEdit(turma: Turma) {
    setFormData({
      name: turma.name,
      curso_id: turma.curso_id,
      sala_id: turma.sala_id,
      cadeiras: turma.cadeiras.toString(),
      period: turma.period,
      start_date: turma.start_date,
      end_date: turma.end_date,
      imposto: turma.imposto.toString(),
      investimento_anuncios: (turma.investimento_anuncios || 0).toString(),
      investimento_anuncios_realizado: (turma.investimento_anuncios_realizado || 0).toString(),
      professores: turma.professores?.map(tp => ({
        professor_id: tp.professor_id,
        hours: tp.hours
      })) || [],
      days_of_week: turma.days_of_week || [],
      horario_inicio: (turma as any).horario_inicio || '',
      horario_fim: (turma as any).horario_fim || '',
      local_aula: (turma as any).local_aula || '',
      endereco_aula: (turma as any).endereco_aula || '',
      carga_horaria_total: (turma as any).carga_horaria_total?.toString() || '',
      acompanhamento_inicio: (turma as any).acompanhamento_inicio || '',
      acompanhamento_fim: (turma as any).acompanhamento_fim || '',
      sessoes_online: (turma as any).sessoes_online || ''
    });
    setEditingId(turma.id);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setFormData({
      name: '',
      curso_id: '',
      sala_id: '',
      cadeiras: '',
      period: 'manha',
      start_date: '',
      end_date: '',
      imposto: '',
      investimento_anuncios: '',
      investimento_anuncios_realizado: '',
      professores: [],
      days_of_week: [],
      horario_inicio: '',
      horario_fim: '',
      local_aula: '',
      endereco_aula: '',
      carga_horaria_total: '',
      acompanhamento_inicio: '',
      acompanhamento_fim: '',
      sessoes_online: ''
    });
    setEditingId(null);
  }

  function handleOpenAlunosInteressados(turma: Turma) {
    if (!turma.curso) return;
    
    setAlunosInteressadosModal({
      isOpen: true,
      turmaId: turma.id,
      cursoId: turma.curso_id,
      turmaPeriod: turma.period,
      cursoNome: turma.curso.nome,
      cursoPreco: turma.curso.preco,
      unidadeId: turma.sala?.unidade_id || ''
    });
  }

  function handleCloseAlunosInteressados() {
    setAlunosInteressadosModal({
      isOpen: false,
      turmaId: '',
      cursoId: '',
      turmaPeriod: 'manha',
      cursoNome: '',
      cursoPreco: 0,
      unidadeId: ''
    });
  }

  function handleOpenAlunosMatriculados(turma: Turma) {
    if (!turma.curso) return;
    
    setAlunosMatriculadosModal({
      isOpen: true,
      turmaId: turma.id,
      cursoId: turma.curso_id,
      cursoNome: turma.curso.nome,
      cursoPreco: turma.curso.preco
    });
  }

  function handleCloseAlunosMatriculados() {
    setAlunosMatriculadosModal({
      isOpen: false,
      turmaId: '',
      cursoId: '',
      cursoNome: '',
      cursoPreco: 0
    });
  }

  function handleOpenComissoes(turma: Turma) {
    if (!turma.curso) return;
    setComissoesTurmaModal({
      isOpen: true,
      turmaId: turma.id,
      cursoNome: turma.curso.nome,
      cursoPreco: turma.curso.preco,
      cadeiras: turma.cadeiras
    });
  }

  function handleStudentEnrolled() {
    loadData(); // Reload data to update enrolled count
  }

  function handleStudentUnenrolled() {
    loadData(); // Reload data to update enrolled count
  }

  function handlePaymentRequested(alunoId: string, alunoNome: string, cursoId: string, cursoPreco: number, turmaId: string) {
    setPaymentModal({
      isOpen: true,
      alunoId,
      alunoNome,
      cursoId,
      cursoPreco,
      turmaId,
      totalParcelas: '1',
      valorTotal: String(cursoPreco),
      firstDueDate: new Date().toISOString().split('T')[0]
    });
  }

  async function handleGeneratePayment(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/api/pagamentos/generate', {
        aluno_id: paymentModal.alunoId,
        curso_id: paymentModal.cursoId,
        turma_id: paymentModal.turmaId,
        total_parcelas: parseInt(paymentModal.totalParcelas),
        valor_total: parseFloat(paymentModal.valorTotal),
        first_due_date: paymentModal.firstDueDate,
      });
      toast.success(`${paymentModal.totalParcelas} parcela(s) gerada(s) para ${paymentModal.alunoNome}!`);
      setPaymentModal(prev => ({ ...prev, isOpen: false }));
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar parcelas');
    }
  }

  function getPeriodIcon(period: Period) {
    return null; // Removido - usando apenas cores
  }

  function getPeriodLabel(period: Period) {
    switch (period) {
      case 'manha': return 'Manhã';
      case 'tarde': return 'Tarde';
      case 'noite': return 'Noite';
      default: return period;
    }
  }

  function getPeriodColor(period: Period) {
    switch (period) {
      case 'manha': return 'text-yellow-400';
      case 'tarde': return 'text-orange-400';
      case 'noite': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  }

  const totalFaturamentoPotencial = turmas.reduce((total, turma) => total + (turma.cadeiras * (turma.curso?.preco || 0)), 0);
  const totalVagas = turmas.reduce((total, turma) => total + turma.cadeiras, 0);
  const totalMatriculados = turmas.reduce((total, turma) => total + (turma.alunos_enrolled?.length || 0), 0);
  const ocupacaoMedia = totalVagas > 0 ? (totalMatriculados / totalVagas) * 100 : 0;

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 fade-in-delay-1">
          <div className="slide-in-left">
            <h1 className="text-3xl font-bold text-white">Turmas</h1>
            <p className="text-gray-400 mt-2">Gerencie as turmas e acompanhe o progresso</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors hover-glow slide-in-right"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nova Turma
          </button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 scale-in">
          <div className="bg-dark-card rounded-2xl p-6 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total de Turmas</p>
                <p className="text-2xl font-bold text-white mt-1">{turmas.length}</p>
              </div>
              <div className="bg-purple-500 p-3 rounded-xl">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-dark-card rounded-2xl p-6 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Faturamento Potencial</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalFaturamentoPotencial)}</p>
              </div>
              <div className="bg-teal-accent p-3 rounded-xl">
                <TrendingUp className="h-6 w-6 text-dark" />
              </div>
            </div>
          </div>

          <div className="bg-dark-card rounded-2xl p-6 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total de Vagas</p>
                <p className="text-2xl font-bold text-white mt-1">{totalVagas}</p>
              </div>
              <div className="bg-blue-500 p-3 rounded-xl">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-dark-card rounded-2xl p-6 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Ocupação Média</p>
                <p className="text-2xl font-bold text-white mt-1">{ocupacaoMedia.toFixed(1)}%</p>
              </div>
              <div className="bg-emerald-500 p-3 rounded-xl">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Sugestões de Turmas */}
        {suggestions.length > 0 && (
          <div className="mb-8 scale-in-delay-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-yellow-400" />
                <h2 className="text-xl font-semibold text-white">Sugestões de Novas Turmas</h2>
                <span className="bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded-full text-sm font-medium">
                  {suggestions.length}
                </span>
              </div>
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  showSuggestions 
                    ? 'bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30' 
                    : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark-card'
                }`}
              >
                <span>{showSuggestions ? 'Ocultar' : 'Ver Sugestões'}</span>
                <AlertCircle className={`h-4 w-4 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
              </button>
            </div>
            
            {showSuggestions && (
              <div className="bg-dark-card rounded-2xl p-6 hover-lift">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suggestions.map((sugestao, index) => (
                    <div key={index} className="bg-dark-lighter rounded-lg p-4 border border-yellow-400/30">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">{sugestao.cursoNome}</h3>
                        <span className="text-yellow-400 text-sm">
                          <span className={getPeriodColor(sugestao.melhorPeriodo)}>{getPeriodLabel(sugestao.melhorPeriodo)}</span>
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-400">
                          {sugestao.totalInteressados} alunos interessados
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const curso = cursos.find(c => c.id === sugestao.cursoId);
                          if (curso) {
                            setFormData({
                              ...formData,
                              name: curso.nome,
                              curso_id: curso.id,
                              period: sugestao.melhorPeriodo
                            });
                            setIsModalOpen(true);
                          }
                        }}
                        className="mt-2 w-full px-3 py-1 bg-yellow-400 text-dark rounded-lg hover:bg-yellow-500 transition-colors text-sm font-medium"
                      >
                        Criar Turma
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lista de Turmas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 scale-in-delay-2">
          {turmas.map((turma) => {
            const ocupacao = turma.cadeiras > 0 ? ((turma.alunos_enrolled?.length || 0) / turma.cadeiras) * 100 : 0;
            const vagasDisponiveis = turma.cadeiras - (turma.alunos_enrolled?.length || 0);
            
            return (
              <div key={turma.id} className="bg-dark-card rounded-2xl p-6 hover-lift hover-scale-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">{turma.name}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-gray-400">
                        <BookOpen className="h-4 w-4 mr-2" />
                        <span>{turma.curso?.nome}</span>
                      </div>
                      <div className="flex items-center text-gray-400">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{turma.sala?.nome}{turma.sala?.unidade_nome ? ` • ${turma.sala.unidade_nome}` : ''}</span>
                      </div>
                      <div className="flex items-center text-gray-400">
                        <Clock className={`h-4 w-4 mr-2 ${getPeriodColor(turma.period)}`} />
                        <span className={getPeriodColor(turma.period)}>{getPeriodLabel(turma.period)}</span>
                      </div>
                      <div className="flex items-center text-gray-400">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{formatDate(turma.start_date)} - {formatDate(turma.end_date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(turma)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(turma.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Barra de ocupação */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-sm">Ocupação</span>
                    <span className="text-white font-semibold">
                      {turma.alunos_enrolled?.length || 0}/{turma.cadeiras}
                    </span>
                  </div>
                  <div className="w-full bg-dark-lighter rounded-full h-2">
                    <div
                      className="bg-teal-accent h-2 rounded-full transition-all duration-300"
                      style={{ width: `${ocupacao}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {ocupacao.toFixed(0)}% ocupado • {vagasDisponiveis} vagas disponíveis
                  </div>
                </div>

                {/* Botão para ver alunos interessados */}
                <button
                  onClick={() => handleOpenAlunosInteressados(turma)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                >
                  <Users className="h-4 w-4" />
                  <span>Ver Alunos Interessados</span>
                </button>

                {/* Botão para ver alunos matriculados */}
                {(turma.alunos_enrolled?.length || 0) > 0 && (
                  <button
                    onClick={() => handleOpenAlunosMatriculados(turma)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Ver Alunos Matriculados ({turma.alunos_enrolled?.length || 0})</span>
                  </button>
                )}

                {/* Botão para ver comissões */}
                {(turma.alunos_enrolled?.length || 0) > 0 && (
                  <button
                    onClick={() => handleOpenComissoes(turma)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                  >
                    <DollarSign className="h-4 w-4" />
                    <span>Ver Comissões da Turma</span>
                  </button>
                )}

                {/* Resumo Financeiro Completo */}
                <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
                  <h4 className="text-white font-medium text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-teal-accent" />
                    Resumo Financeiro
                  </h4>
                  
                  {(() => {
                    const alunosMatriculados = turma.alunos_enrolled?.length || 0;
                    const precoUnitario = turma.curso?.preco || 0;
                    const faturamentoPotencial = turma.cadeiras * precoUnitario;
                    const faturamentoRealizado = alunosMatriculados * precoUnitario;
                    
                    // Calcular custos com professores
                    const custoProfessores = turma.professores?.reduce((total, tp) => {
                      return total + (tp.hours * tp.professor.valor_hora);
                    }, 0) || 0;
                    
                    // Calcular impostos
                    const impostos = (faturamentoRealizado * turma.imposto) / 100;
                    
                    // Calcular comissão do vendedor baseada na ocupação
                    const ocupacaoPercentual = turma.cadeiras > 0 ? (alunosMatriculados / turma.cadeiras) * 100 : 0;
                    const percentualComissao = ocupacaoPercentual >= 90 ? 5 : 2;
                    const comissaoVendedor = (faturamentoRealizado * percentualComissao) / 100;
                    
                    // Resultado final
                    const investAnunciosPrevisto = turma.investimento_anuncios || 0;
                    const investAnunciosRealizado = turma.investimento_anuncios_realizado || 0;
                    const resultadoFinal = faturamentoRealizado - custoProfessores - impostos - comissaoVendedor - investAnunciosRealizado;
                    const margemLucro = faturamentoRealizado > 0 ? (resultadoFinal / faturamentoRealizado) * 100 : 0;
                    
                    return (
                      <div className="space-y-2 text-xs">
                        {/* Faturamento */}
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Potencial Total:</span>
                          <span className="text-gray-300 font-medium">
                            {formatCurrency(faturamentoPotencial)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Realizado ({alunosMatriculados} alunos):</span>
                          <span className="text-emerald-400 font-semibold">
                            {formatCurrency(faturamentoRealizado)}
                          </span>
                        </div>
                        
                        {/* Custos */}
                        <div className="pt-2 border-t border-gray-700/50">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Professores:</span>
                            <span className="text-red-400 font-medium">
                              -{formatCurrency(custoProfessores)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Impostos ({turma.imposto}%):</span>
                            <span className="text-red-400 font-medium">
                              -{formatCurrency(impostos)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Vendedor ({percentualComissao}%):</span>
                            <span className="text-red-400 font-medium">
                              -{formatCurrency(comissaoVendedor)}
                            </span>
                          </div>
                          
                          {/* Ads — previsto vs realizado */}
                          <div className="flex justify-between items-center mt-1">
                            <div>
                              <span className="text-gray-400">Ads Previsto:</span>
                            </div>
                            <span
                              className="text-gray-500 font-medium cursor-pointer hover:underline"
                              onClick={(e) => {
                                const span = e.currentTarget;
                                const currentVal = turma.investimento_anuncios || 0;
                                const input = document.createElement('input');
                                input.type = 'number';
                                input.value = String(currentVal);
                                input.min = '0';
                                input.step = '100';
                                input.className = 'w-20 bg-dark-lighter border border-teal-accent rounded px-1.5 py-0.5 text-gray-400 text-xs text-right focus:ring-1 focus:ring-teal-accent outline-none font-medium';
                                const save = async () => {
                                  const val = parseFloat(input.value) || 0;
                                  if (val !== currentVal) {
                                    try {
                                      await api.patch(`/api/turmas/${turma.id}/investimento`, { investimento_anuncios: val });
                                      loadData();
                                    } catch { toast.error('Erro ao salvar investimento'); }
                                  }
                                  span.style.display = '';
                                  input.remove();
                                };
                                input.onblur = save;
                                input.onkeydown = (ev) => { if (ev.key === 'Enter') input.blur(); if (ev.key === 'Escape') { span.style.display = ''; input.remove(); } };
                                span.style.display = 'none';
                                span.parentElement!.appendChild(input);
                                input.focus();
                                input.select();
                              }}
                              title="Clique para editar"
                            >
                              {formatCurrency(investAnunciosPrevisto)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Ads Realizado:</span>
                            <span
                              className="text-red-400 font-medium cursor-pointer hover:underline"
                              onClick={(e) => {
                                const span = e.currentTarget;
                                const currentVal = turma.investimento_anuncios_realizado || 0;
                                const input = document.createElement('input');
                                input.type = 'number';
                                input.value = String(currentVal);
                                input.min = '0';
                                input.step = '100';
                                input.className = 'w-20 bg-dark-lighter border border-teal-accent rounded px-1.5 py-0.5 text-red-400 text-xs text-right focus:ring-1 focus:ring-teal-accent outline-none font-medium';
                                const save = async () => {
                                  const val = parseFloat(input.value) || 0;
                                  if (val !== currentVal) {
                                    try {
                                      await api.patch(`/api/turmas/${turma.id}/investimento`, { investimento_anuncios_realizado: val });
                                      loadData();
                                    } catch { toast.error('Erro ao salvar investimento'); }
                                  }
                                  span.style.display = '';
                                  input.remove();
                                };
                                input.onblur = save;
                                input.onkeydown = (ev) => { if (ev.key === 'Enter') input.blur(); if (ev.key === 'Escape') { span.style.display = ''; input.remove(); } };
                                span.style.display = 'none';
                                span.parentElement!.appendChild(input);
                                input.focus();
                                input.select();
                              }}
                              title="Clique para editar"
                            >
                              -{formatCurrency(investAnunciosRealizado)}
                            </span>
                          </div>
                          {investAnunciosRealizado > investAnunciosPrevisto && investAnunciosPrevisto > 0 && (
                            <div className="text-[10px] text-red-400 text-right">
                              ⚠️ Acima do previsto em {formatCurrency(investAnunciosRealizado - investAnunciosPrevisto)}
                            </div>
                          )}
                        </div>
                        
                        {/* Resultado Final */}
                        <div className="pt-2 border-t border-gray-600">
                          <div className="flex justify-between items-center">
                            <span className="text-white font-medium">Resultado Final:</span>
                            <span className={`font-bold ${
                              resultadoFinal >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {formatCurrency(resultadoFinal)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-gray-400">Margem de Lucro:</span>
                            <span className={`font-medium ${
                              margemLucro >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {margemLucro.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        
                        {/* Ponto de Equilíbrio */}
                        {precoUnitario > 0 && (() => {
                          // Revenue per student after variable costs (taxes + commission at base 2%)
                          const totalVariableRate = turma.imposto + 2; // imposto% + vendedor base 2%
                          const netRevenuePerStudent = precoUnitario * (1 - totalVariableRate / 100);
                          const fixedCosts = custoProfessores + investAnunciosRealizado;
                          const pontoEquilibrio = netRevenuePerStudent > 0 
                            ? Math.ceil(fixedCosts / netRevenuePerStudent) 
                            : 0;
                          const faltam = Math.max(0, pontoEquilibrio - alunosMatriculados);
                          const atingiu = alunosMatriculados >= pontoEquilibrio && pontoEquilibrio > 0;
                          
                          return (
                            <div className="pt-2 border-t border-gray-700/50">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Ponto de Equilíbrio:</span>
                                <span className={`font-bold ${atingiu ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {pontoEquilibrio} alunos
                                </span>
                              </div>
                              {!atingiu && pontoEquilibrio > 0 && (
                                <div className="mt-1 text-right">
                                  <span className="text-amber-400 text-[10px]">
                                    Faltam {faltam} aluno{faltam !== 1 ? 's' : ''} para cobrir custos
                                  </span>
                                </div>
                              )}
                              {atingiu && (
                                <div className="mt-1 text-right">
                                  <span className="text-emerald-400 text-[10px]">
                                    ✅ Custos cobertos!
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        
                        {/* Indicadores visuais */}
                        {alunosMatriculados === 0 && (
                          <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-xs">
                            ⚠️ Nenhum aluno matriculado ainda
                          </div>
                        )}
                        
                        {resultadoFinal < 0 && alunosMatriculados > 0 && (
                          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
                            📉 Turma com resultado negativo
                          </div>
                        )}
                        
                        {resultadoFinal > 0 && margemLucro > 20 && (
                          <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 text-xs">
                            📈 Excelente margem de lucro!
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
          {turmas.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-8">
              Nenhuma turma cadastrada
            </div>
          )}
        </div>

        {/* Calendário de Ocupação das Salas */}
        <CalendarOcupacaoSalas salas={salas} turmas={turmas} />

        <ModalTurma
          isOpen={isModalOpen}
          editingId={editingId}
          formData={formData}
          setFormData={setFormData}
          cursos={cursos}
          salas={salas}
          professores={professores}
          onSubmit={handleSubmit}
          onClose={handleCloseModal}
        />

        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title="Excluir Turma"
          message={`Tem certeza que deseja excluir a turma "${confirmModal.turmaNome}"? Esta ação não pode ser desfeita e removerá todos os dados relacionados.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          variant="danger"
        />

        <ModalAlunosInteressados
          isOpen={alunosInteressadosModal.isOpen}
          onClose={handleCloseAlunosInteressados}
          turmaId={alunosInteressadosModal.turmaId}
          cursoId={alunosInteressadosModal.cursoId}
          turmaPeriod={alunosInteressadosModal.turmaPeriod}
          cursoNome={alunosInteressadosModal.cursoNome}
          cursoPreco={alunosInteressadosModal.cursoPreco}
          unidadeId={alunosInteressadosModal.unidadeId}
          onStudentEnrolled={handleStudentEnrolled}
          onPaymentRequested={handlePaymentRequested}
        />

        <ModalAlunosMatriculados
          isOpen={alunosMatriculadosModal.isOpen}
          onClose={handleCloseAlunosMatriculados}
          turmaId={alunosMatriculadosModal.turmaId}
          cursoId={alunosMatriculadosModal.cursoId}
          cursoNome={alunosMatriculadosModal.cursoNome}
          cursoPreco={alunosMatriculadosModal.cursoPreco}
          onStudentUnenrolled={handleStudentUnenrolled}
        />

        <ModalComissoesTurma
          isOpen={comissoesTurmaModal.isOpen}
          onClose={() => setComissoesTurmaModal({ ...comissoesTurmaModal, isOpen: false })}
          turmaId={comissoesTurmaModal.turmaId}
          cursoNome={comissoesTurmaModal.cursoNome}
          cursoPreco={comissoesTurmaModal.cursoPreco}
          cadeiras={comissoesTurmaModal.cadeiras}
        />

        {/* Payment Generation Modal */}
        {paymentModal.isOpen && createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10001] p-4 fade-in">
            <div className="bg-dark-card rounded-2xl p-6 w-full max-w-md scale-in" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-6 w-6 text-teal-accent" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Gerar Parcelas</h2>
                    <p className="text-gray-400 text-sm">{paymentModal.alunoNome}</p>
                  </div>
                </div>
                <button onClick={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))} className="text-gray-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleGeneratePayment} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Nº Parcelas</label>
                    <input type="number" min="1" max="24" required value={paymentModal.totalParcelas}
                      onChange={e => setPaymentModal(prev => ({ ...prev, totalParcelas: e.target.value }))}
                      className="w-full bg-dark-lighter text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-teal-accent outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Valor Total</label>
                    <input type="number" step="0.01" min="0" required value={paymentModal.valorTotal}
                      onChange={e => setPaymentModal(prev => ({ ...prev, valorTotal: e.target.value }))}
                      className="w-full bg-dark-lighter text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-teal-accent outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">1º Vencimento</label>
                  <input type="date" required value={paymentModal.firstDueDate}
                    onChange={e => setPaymentModal(prev => ({ ...prev, firstDueDate: e.target.value }))}
                    className="w-full bg-dark-lighter text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-teal-accent outline-none" />
                </div>
                {parseInt(paymentModal.totalParcelas) > 0 && parseFloat(paymentModal.valorTotal) > 0 && (
                  <div className="bg-dark-lighter rounded-xl p-3 text-sm">
                    <p className="text-gray-400">{paymentModal.totalParcelas}x de <span className="text-white font-medium">{formatCurrency(parseFloat(paymentModal.valorTotal) / parseInt(paymentModal.totalParcelas))}</span></p>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-3 rounded-xl bg-dark-lighter text-gray-400 hover:text-white transition-colors">Pular</button>
                  <button type="submit" className="flex-1 py-3 rounded-xl bg-teal-accent text-dark font-medium hover:bg-teal-400 transition-colors">Gerar Parcelas</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}