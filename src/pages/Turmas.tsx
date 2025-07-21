import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2, Calendar, Users, MapPin, Clock, Lightbulb, ChevronDown, ChevronUp, Sun, Sunset, Moon, Search, Filter, BookOpen, Check, X, RefreshCw, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ModalTurma } from '../components/ModalTurma';
import { ModalAlunosInteressados } from '../components/ModalAlunosInteressados';
import { CalendarOcupacaoSalas } from '../components/CalendarOcupacaoSalas';

/**
 * Tipos de período disponíveis para as turmas
 */
type Period = 'manha' | 'tarde' | 'noite';
type TurmaStatus = 'aberta' | 'andamento' | 'finalizada' | 'all';

/**
 * Configuração dos períodos com ícones correspondentes
 */
const PERIODS: { value: Period; label: string; icon: typeof Sun }[] = [
  { value: 'manha', label: 'Manhã', icon: Sun },
  { value: 'tarde', label: 'Tarde', icon: Sunset },
  { value: 'noite', label: 'Noite', icon: Moon }
];

/**
 * Interface para dados de uma turma
 * Inclui relacionamentos com curso, sala, professores e alunos
 */
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
  curso?: {
    nome: string;
    preco: number;
    carga_horaria: number;
  };
  sala?: {
    nome: string;
    cadeiras: number;
  };
  professores?: Array<{
    id: string;
    nome: string;
    hours: number;
  }>;
  alunos_interessados?: Array<{
    id: string;
    nome: string;
  }>;
  alunos_enrolled?: Array<{
    id: string;
    nome: string;
  }>;
  alunos_completed?: Array<{
    id: string;
    nome: string;
  }>;
}

/**
 * Interfaces para entidades relacionadas
 */
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
}

/**
 * Interface para sugestões de novas turmas baseadas em demanda
 */
interface Suggestion {
  curso: Curso;
  period: Period;
  interestedCount: number;
  potentialRevenue: number;
}

/**
 * Componente principal da página de Turmas
 * 
 * Funcionalidades:
 * - Listagem de turmas com filtros avançados
 * - Criação e edição de turmas
 * - Sugestões inteligentes baseadas em demanda
 * - Gestão de alunos interessados/matriculados
 * - Cálculos financeiros automáticos
 * - Controle de conflitos de sala/horário
 */
export function Turmas() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<Period | 'all'>('all');
  const [filterCurso, setFilterCurso] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<TurmaStatus>('aberta');
  const [expandedTurma, setExpandedTurma] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    turmaId: '',
    turmaNome: ''
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
    professores: [] as ProfessorAssignment[],
    days_of_week: [] as number[]
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [alunosInteressadosModal, setAlunosInteressadosModal] = useState({
    isOpen: false,
    turmaId: '',
    cursoId: '',
    turmaPeriod: '' as Period,
    cursoNome: '',
    cursoPreco: 0
  });
  const [isProcessingCompletion, setIsProcessingCompletion] = useState(false);

  /**
   * Determina o status de uma turma baseado nas datas
   * 
   * @param startDate - Data de início da turma
   * @param endDate - Data de término da turma
   * @returns Status da turma (aberta/andamento/finalizada)
   */
  function getTurmaStatus(startDate: string, endDate: string): TurmaStatus {
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Remove time component for accurate date comparison
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    if (today < start) {
      return 'aberta'; // Ainda não começou
    } else if (today >= start && today <= end) {
      return 'andamento'; // Em andamento
    } else {
      return 'finalizada'; // Já terminou
    }
  }

  /**
   * Retorna a cor CSS correspondente ao status da turma
   */
  function getStatusColor(status: TurmaStatus): string {
    switch (status) {
      case 'aberta':
        return 'text-blue-400';
      case 'andamento':
        return 'text-green-400';
      case 'finalizada':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  }

  /**
   * Retorna o label em português para o status da turma
   */
  function getStatusLabel(status: TurmaStatus): string {
    switch (status) {
      case 'aberta':
        return 'Aberta';
      case 'andamento':
        return 'Em Andamento';
      case 'finalizada':
        return 'Finalizada';
      default:
        return '';
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Carrega todos os dados necessários para a página
   * 
   * Busca:
   * - Turmas com relacionamentos
   * - Cursos disponíveis
   * - Salas disponíveis
   * - Professores
   * - Interesses de alunos
   * 
   * Também processa dados para adicionar informações calculadas
   */
  async function loadData() {
    try {
      const [turmasResult, cursosResult, salasResult, professoresResult, interessesResult] = await Promise.all([
        supabase
          .from('turmas')
          .select(`
            *,
            curso:cursos(*, categoria:categorias(nome)),
            sala:salas(*),
            professores:turma_professores(
              id,
              hours,
              professor:professores(id, nome)
            )
          `)
          .order('created_at', { ascending: false }),
        supabase.from('cursos').select('*').order('nome'),
        supabase.from('salas').select('*').order('nome'),
        supabase.from('professores').select('*').order('nome'),
        supabase
          .from('aluno_curso_interests')
          .select(`
            curso_id,
            status,
            turma_id,
            aluno:alunos(id, nome, available_periods)
          `)
      ]);

      if (turmasResult.error) throw turmasResult.error;
      if (cursosResult.error) throw cursosResult.error;
      if (salasResult.error) throw salasResult.error;
      if (professoresResult.error) throw professoresResult.error;
      if (interessesResult.error) throw interessesResult.error;

      // Debug: Log the raw data to check dates
      console.log('Raw turmas data:', turmasResult.data);
      const turmasData = turmasResult.data.map(turma => ({
        ...turma,
        professores: turma.professores?.map((tp: any) => ({
          id: tp.professor.id,
          nome: tp.professor.nome,
          hours: tp.hours
        })) || [],
        alunos_interessados: interessesResult.data
          .filter((interest: any) => 
            interest.curso_id === turma.curso_id && 
            interest.status === 'interested' &&
            !interest.turma_id &&
            // Filter by period availability
            (!interest.aluno.available_periods || 
             interest.aluno.available_periods.length === 0 || 
             interest.aluno.available_periods.includes(turma.period))
          )
          .map((interest: any) => ({
            id: interest.aluno.id,
            nome: interest.aluno.nome
          })),
        alunos_enrolled: interessesResult.data
          .filter((interest: any) => 
            interest.turma_id === turma.id && 
            interest.status === 'enrolled'
          )
          .map((interest: any) => ({
            id: interest.aluno.id,
            nome: interest.aluno.nome
          })),
        alunos_completed: interessesResult.data
          .filter((interest: any) => 
            interest.turma_id === turma.id && 
            interest.status === 'completed'
          )
          .map((interest: any) => ({
            id: interest.aluno.id,
            nome: interest.aluno.nome
          }))
      }));

      setTurmas(turmasData);
      setCursos(cursosResult.data);
      setSalas(salasResult.data);
      setProfessores(professoresResult.data);

      // Generate suggestions
      await generateSuggestions(cursosResult.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    }
  }

  /**
   * Gera sugestões de novas turmas baseadas na demanda de alunos
   * 
   * Analisa:
   * - Número de alunos interessados por curso
   * - Períodos de maior demanda
   * - Potencial de faturamento
   * 
   * @param cursosData - Lista de cursos disponíveis
   */
  async function generateSuggestions(cursosData: Curso[]) {
    try {
      const { data: interests, error } = await supabase
        .from('aluno_curso_interests')
        .select(`
          curso_id,
          status,
          aluno:alunos(available_periods)
        `)
        .eq('status', 'interested');

      if (error) throw error;

      const suggestionMap: { [cursoId: string]: Suggestion } = {};

      interests.forEach((interest: any) => {
        const curso = cursosData.find(c => c.id === interest.curso_id);
        if (!curso) return;
        
        const studentPeriods = interest.aluno?.available_periods || [];

        if (!suggestionMap[curso.id]) {
          suggestionMap[curso.id] = {
            curso,
            period: 'manha',
            interestedCount: 0,
            potentialRevenue: 0
          };
        }

        suggestionMap[curso.id].interestedCount++;
        suggestionMap[curso.id].potentialRevenue += curso.preco;
      });

      // Calculate most demanded period for each course
      const periodDemand: { [cursoId: string]: { manha: number; tarde: number; noite: number } } = {};
      
      interests.forEach((interest: any) => {
        const curso = cursosData.find(c => c.id === interest.curso_id);
        if (!curso) return;
        
        if (!periodDemand[curso.id]) {
          periodDemand[curso.id] = { manha: 0, tarde: 0, noite: 0 };
        }
      // Sort by potential revenue (highest first) and take top 6, with minimum of 1 interested student
        
        const studentPeriods = interest.aluno?.available_periods || [];
        
        if (studentPeriods.length === 0) {
          // Student available for all periods
          periodDemand[curso.id].manha++;
          periodDemand[curso.id].tarde++;
          periodDemand[curso.id].noite++;
        } else {
          // Count specific periods
          studentPeriods.forEach((period: Period) => {
            periodDemand[curso.id][period]++;
          });
        }
      });
      
      // Determine most demanded period for each suggestion
      Object.values(suggestionMap).forEach(suggestion => {
        const demand = periodDemand[suggestion.curso.id];
        if (demand) {
          let maxDemand = 0;
          let mostDemanded: Period = 'manha';
          
          (['manha', 'tarde', 'noite'] as Period[]).forEach(period => {
            if (demand[period] > maxDemand) {
              maxDemand = demand[period];
              mostDemanded = period;
            }
          });
          
          suggestion.period = mostDemanded;
        }
      });

      // Filter suggestions with at least 2 interested students and sort by potential revenue
      const filteredSuggestions = Object.values(suggestionMap)
        .filter(s => s.interestedCount >= 1)
        .sort((a, b) => b.potentialRevenue - a.potentialRevenue);
      console.log('Generated suggestions:', filteredSuggestions.map(s => ({
        curso: s.curso.nome,
        period: s.period,
        interested: s.interestedCount,
        revenue: s.potentialRevenue
      })));

      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }
  }

  /**
   * Retorna o ícone correspondente ao período
   */
  function getPeriodIcon(period: Period) {
    const periodConfig = PERIODS.find(p => p.value === period);
    const Icon = periodConfig?.icon || Sun;
    return <Icon className="h-4 w-4" />;
  }

  /**
   * Retorna o label em português do período
   */
  function getPeriodLabel(period: Period) {
    return PERIODS.find(p => p.value === period)?.label || '';
  }

  /**
   * Submete o formulário de criação/edição de turma
   * 
   * Inclui validações:
   * - Conflitos de sala/horário
   * - Dados obrigatórios
   * - Cálculos automáticos
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      // Check for room conflicts before saving
      const hasConflict = await checkRoomConflict(
        formData.sala_id,
        formData.period,
        potencial_faturamento: potencialFaturamento,
        days_of_week: formData.days_of_week,
        end_date: formData.end_date
      );

      if (hasConflict) {
        toast.error('Conflito de agendamento: Já existe uma turma nesta sala, no mesmo período e com datas sobrepostas');
        return;
      }

      const curso = cursos.find(c => c.id === formData.curso_id);
      if (!curso) throw new Error('Curso não encontrado');

      const turmaData = {
        name: formData.name,
        curso_id: formData.curso_id,
        sala_id: formData.sala_id,
        cadeiras: Number(formData.cadeiras),
        period: formData.period,
        start_date: formData.start_date,
        end_date: formData.end_date,
        potencial_faturamento: curso.preco * Number(formData.cadeiras),
        imposto: Number(formData.imposto)
      };

      if (editingId) {
        const { error } = await supabase
          .from('turmas')
          .update(turmaData)
          .eq('id', editingId);
        
        if (error) throw error;

        // Update professors
        await updateTurmaProfessores(editingId, formData.professores);
        toast.success('Turma atualizada com sucesso!');
      } else {
        const { data: newTurma, error } = await supabase
          .from('turmas')
          .insert([turmaData])
          .select()
          .single();
        
        if (error) throw error;

        // Add professors
        if (newTurma) {
          await updateTurmaProfessores(newTurma.id, formData.professores);
        }
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
        professores: []
      });
      setEditingId(null);
      
      // Force reload data to ensure UI is updated
      await loadData();
      
      // Force a small delay to ensure state updates
      setTimeout(() => {
        loadData();
      }, 100);
    } catch (error) {
      toast.error('Erro ao salvar turma');
    }
  }

  /**
   * Verifica se há conflito de sala no período e datas especificados
   * 
   * @param salaId - ID da sala
   * @param period - Período da turma
   * @param startDate - Data de início
   * @param endDate - Data de término
   * @param excludeTurmaId - ID da turma a excluir da verificação (para edição)
   * @returns true se houver conflito, false caso contrário
   */
  async function checkRoomConflict(
    salaId: string,
    period: Period,
    startDate: string,
    endDate: string,
    excludeTurmaId?: string | null
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('turmas')
        .select('id, name, start_date, end_date')
        .eq('sala_id', salaId)
        .eq('period', period);

      // Exclude current turma when editing
      if (excludeTurmaId) {
        query = query.neq('id', excludeTurmaId);
      }

      const { data: existingTurmas, error } = await query;

      if (error) throw error;

      // Check for date overlaps
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);

      for (const turma of existingTurmas) {
        const existingStart = new Date(turma.start_date);
        const existingEnd = new Date(turma.end_date);

        // Check if dates overlap
        const hasOverlap = (
          (newStart <= existingEnd && newEnd >= existingStart)
        );

        if (hasOverlap) {
          return true; // Conflict found
        }
      }

      return false; // No conflict
    } catch (error) {
      console.error('Error checking room conflict:', error);
      return false; // Allow operation if check fails
    }
  }

  /**
   * Atualiza os professores atribuídos a uma turma
   * 
   * Remove todas as atribuições existentes e cria novas
   * 
   * @param turmaId - ID da turma
   * @param professoresData - Array com professores e suas horas
   */
  async function updateTurmaProfessores(turmaId: string, professoresData: Array<{ professor_id: string; hours: number }>) {
    try {
      // Remove existing professor assignments
      await supabase
        .from('turma_professores')
        .delete()
        .eq('turma_id', turmaId);

      // Add new professor assignments
      if (professoresData.length > 0) {
        const assignments = professoresData.map(prof => ({
          turma_id: turmaId,
          professor_id: prof.professor_id,
          hours: prof.hours
        }));

        const { error } = await supabase
          .from('turma_professores')
          .insert(assignments);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating turma professores:', error);
      throw error;
    }
  }

  /**
   * Inicia o processo de exclusão de uma turma
   * Abre modal de confirmação
   */
  async function handleDelete(id: string) {
    const turma = turmas.find(t => t.id === id);
    if (!turma) return;

    setConfirmModal({
      isOpen: true,
      turmaId: id,
      turmaNome: turma.name
    });
  }

  /**
   * Confirma e executa a exclusão da turma
   */
  async function handleConfirmDelete() {
    try {
      const { error } = await supabase
        .from('turmas')
        .delete()
        .eq('id', confirmModal.turmaId);
      
      if (error) throw error;
      toast.success('Turma excluída com sucesso!');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir turma');
    } finally {
      setConfirmModal({ isOpen: false, turmaId: '', turmaNome: '' });
    }
  }

  /**
   * Cancela a exclusão da turma
   */
  function handleCancelDelete() {
    setConfirmModal({ isOpen: false, turmaId: '', turmaNome: '' });
  }

  /**
   * Prepara o formulário para edição de uma turma existente
   */
  function handleEdit(turma: Turma) {
    if (!turma) {
      console.error('Turma is undefined in handleEdit');
      return;
    }

    setFormData({
      name: turma.name,
      curso_id: turma.curso_id,
      sala_id: turma.sala_id,
      cadeiras: turma.cadeiras.toString(),
      period: turma.period,
      start_date: turma.start_date,
      end_date: turma.end_date,
      imposto: turma.imposto.toString(),
      professores: turma.professores?.map(tp => ({
        professor_id: tp.professor?.id || '',
        hours: tp.hours
      })) || [],
      days_of_week: turma.days_of_week || []
    });
    setEditingId(turma.id);
    setIsModalOpen(true);
  }

  /**
   * Fecha o modal e limpa o formulário
   */
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
      professores: [],
      days_of_week: []
    });
    setEditingId(null);
  }

  /**
   * Formata data para exibição em português
   */
  function formatDate(dateString: string) {
    // Ensure we're working with the correct date format
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Matricula um aluno interessado em uma turma específica
   */
  async function handleEnrollStudent(alunoId: string, turmaId: string, cursoId: string) {
    try {
      // Verificar conflitos de horário antes de matricular
      const hasConflict = await checkStudentScheduleConflict(alunoId, turmaId);
      if (hasConflict) {
        toast.error('Conflito de horário! O aluno já está matriculado em outra turma no mesmo período e com datas sobrepostas.');
        return;
      }

      const { error } = await supabase
        .from('aluno_curso_interests')
        .update({ 
          status: 'enrolled',
          turma_id: turmaId
        })
        .eq('aluno_id', alunoId)
        .eq('curso_id', cursoId);
      
      if (error) throw error;
      toast.success('Aluno matriculado na turma!');
      loadData();
    } catch (error) {
      toast.error('Erro ao matricular aluno');
    }
  }

  /**
   * Verifica se há conflito de horário para um aluno em uma nova turma
   */
  async function checkStudentScheduleConflict(alunoId: string, newTurmaId: string): Promise<boolean> {
    try {
      // Buscar informações da nova turma
      const { data: newTurma, error: newTurmaError } = await supabase
        .from('turmas')
        .select('period, start_date, end_date')
        .eq('id', newTurmaId)
        .single();

      if (newTurmaError) throw newTurmaError;

      // Buscar todas as turmas em que o aluno já está matriculado
      const { data: enrolledTurmas, error: enrolledError } = await supabase
        .from('aluno_curso_interests')
        .select(`
          turma:turmas(
            id,
            period,
            start_date,
            end_date,
            name
          )
        `)
        .eq('aluno_id', alunoId)
        .eq('status', 'enrolled')
        .not('turma_id', 'is', null);

      if (enrolledError) throw enrolledError;

      // Verificar conflitos
      const newStartDate = new Date(newTurma.start_date + 'T00:00:00');
      const newEndDate = new Date(newTurma.end_date + 'T00:00:00');

      for (const enrollment of enrolledTurmas) {
        if (!enrollment.turma) continue;

        const existingTurma = enrollment.turma;
        
        // Verificar se é o mesmo período
        if (existingTurma.period === newTurma.period) {
          // Verificar sobreposição de datas
          const existingStartDate = new Date(existingTurma.start_date + 'T00:00:00');
          const existingEndDate = new Date(existingTurma.end_date + 'T00:00:00');

          const hasDateOverlap = (
            (newStartDate <= existingEndDate && newEndDate >= existingStartDate)
          );

          if (hasDateOverlap) {
            console.log(`Conflito encontrado: Aluno já matriculado na turma "${existingTurma.name}" no mesmo período`);
            return true; // Conflito encontrado
          }
        }
      }

      return false; // Sem conflitos
    } catch (error) {
      console.error('Erro ao verificar conflitos de horário:', error);
      throw error;
    }
  }

  /**
   * Marca um aluno como tendo concluído o curso
   */
  async function handleCompleteStudent(alunoId: string, turmaId: string, cursoId: string) {
    try {
      const { error } = await supabase
        .from('aluno_curso_interests')
        .update({ status: 'completed' })
        .eq('aluno_id', alunoId)
        .eq('curso_id', cursoId)
        .eq('turma_id', turmaId);
      
      if (error) throw error;
      toast.success('Aluno marcado como concluído!');
      loadData();
    } catch (error) {
      toast.error('Erro ao marcar aluno como concluído');
    }
  }

  /**
   * Remove um aluno de uma turma (volta para interessado)
   */
  async function handleUnenrollStudent(alunoId: string, cursoId: string) {
    try {
      const { error } = await supabase
        .from('aluno_curso_interests')
        .update({ 
          status: 'interested',
          turma_id: null
        })
        .eq('aluno_id', alunoId)
        .eq('curso_id', cursoId);
      
      if (error) throw error;
      toast.success('Aluno removido da turma');
      loadData();
    } catch (error) {
      toast.error('Erro ao remover aluno da turma');
    }
  }

  /**
   * Abre modal com lista de alunos interessados na turma
   */
  function handleOpenAlunosInteressados(turma: Turma) {
    setAlunosInteressadosModal({
      isOpen: true,
      turmaId: turma.id,
      cursoId: turma.curso_id,
      turmaPeriod: turma.period,
      cursoNome: turma.curso?.nome || '',
      cursoPreco: turma.curso?.preco || 0
    });
  }

  /**
   * Fecha modal de alunos interessados
   */
  function handleCloseAlunosInteressados() {
    setAlunosInteressadosModal({
      isOpen: false,
      turmaId: '',
      cursoId: '',
      turmaPeriod: 'manha',
      cursoNome: '',
      cursoPreco: 0
    });
  }

  /**
   * Processa automaticamente a conclusão de alunos em turmas finalizadas
   */
  async function handleMarkStudentsCompleted() {
    setIsProcessingCompletion(true);
    try {
      // Chama a função SQL que processa as conclusões
      const { data, error } = await supabase.rpc('mark_students_as_completed');
      
      if (error) throw error;
      
      toast.success('Conclusões processadas com sucesso!');
      
      // Recarrega os dados para refletir as mudanças
      await loadData();
    } catch (error) {
      console.error('Erro ao processar conclusões:', error);
      toast.error('Erro ao processar conclusões automáticas');
    } finally {
      setIsProcessingCompletion(false);
    }
  }

  /**
   * Filtra turmas baseado nos critérios de busca e filtros
   */
  const filteredTurmas = turmas.filter(turma => {
    const matchesSearch = turma.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      turma.curso?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      turma.sala?.nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPeriod = filterPeriod === 'all' || turma.period === filterPeriod;
    const matchesCurso = filterCurso === 'all' || turma.curso_id === filterCurso;
    const turmaStatus = getTurmaStatus(turma.start_date, turma.end_date);
    const matchesStatus = filterStatus === 'all' || turmaStatus === filterStatus;
    
    return matchesSearch && matchesPeriod && matchesCurso && matchesStatus;
  });

  /**
   * Configuração dos filtros de status disponíveis
   */
  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 fade-in-delay-1">
          <div className="slide-in-left">
            <h1 className="text-3xl font-bold text-white">Turmas</h1>
            <p className="text-gray-400 mt-2">Gerencie as turmas ativas e planeje novas ofertas</p>
          </div>
          <div className="flex items-center gap-4 slide-in-right">
            <button
              onClick={handleMarkStudentsCompleted}
              disabled={isProcessingCompletion}
              className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                isProcessingCompletion
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:text-green-300'
              }`}
              title="Processar conclusões automáticas para turmas finalizadas"
            >
              {isProcessingCompletion ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
              <span>
                {isProcessingCompletion ? 'Processando...' : 'Processar Conclusões'}
              </span>
            </button>
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                showSuggestions 
                  ? 'bg-orange-500 text-white hover:bg-orange-600' 
                  : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 hover:text-orange-300'
              }`}
            >
              <Lightbulb className="h-5 w-5" />
              <span>{showSuggestions ? 'Ocultar Sugestões' : 'Ver Sugestões'}</span>
              {showSuggestions ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="relative z-10 flex items-center px-4 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors hover-glow"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nova Turma
            </button>
          </div>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="mb-6 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-2xl p-6 fade-in-delay-3 relative scale-in z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Lightbulb className="h-6 w-6 text-orange-400" />
                <h2 className="text-xl font-semibold text-white">Sugestões de Novas Turmas</h2>
              </div>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-orange-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-300 mb-6">
              Baseado no interesse dos alunos cadastrados, considere criar turmas para:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.curso.id}
                  className="bg-gradient-to-br from-orange-900/30 to-amber-900/30 border border-orange-500/30 rounded-xl p-4 hover:border-orange-400/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white">{suggestion.curso.nome}</h3>
                    <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded-lg text-xs font-medium">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Alunos interessados:</span>
                      <span className="text-white font-semibold">{suggestion.interestedCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Faturamento potencial:</span>
                      <span className="text-emerald-400 font-semibold">
                        {formatCurrency(suggestion.potentialRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Carga horária:</span>
                      <span className="text-white">{suggestion.curso.carga_horaria}h</span>
                    </div>
                    {suggestion.period && (
                      <div>
                        <span className="text-gray-400 text-xs">Horário de maior demanda:</span>
                        <div className="mt-1">
                          <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">
                            {getPeriodIcon(suggestion.period)}
                            <span>{getPeriodLabel(suggestion.period)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 space-y-4 scale-in-delay-1">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar turmas, cursos ou salas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-dark-lighter border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value as Period | 'all')}
                className="bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
              >
                <option value="all">Todos os períodos</option>
                {PERIODS.map(period => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
              
              <select
                value={filterCurso}
                onChange={(e) => setFilterCurso(e.target.value)}
                className="bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
              >
                <option value="all">Todos os cursos</option>
                {cursos.map(curso => (
                  <option key={curso.id} value={curso.id}>
                    {curso.nome}
                  </option>
                ))}
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as TurmaStatus)}
                className="bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
              >
                <option value="all">Todos os status</option>
                <option value="aberta">Abertas</option>
                <option value="andamento">Em Andamento</option>
                <option value="finalizada">Finalizadas</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 scale-in-delay-1">
          {filteredTurmas.map((turma) => (
            <div key={turma.id} className="bg-dark-card rounded-2xl p-6 hover-lift hover-scale-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">{turma.name}</h3>
                  <div className="mb-3 flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      getTurmaStatus(turma.start_date, turma.end_date) === 'aberta' 
                        ? 'bg-blue-500/20 text-blue-400'
                        : getTurmaStatus(turma.start_date, turma.end_date) === 'andamento'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {getStatusLabel(getTurmaStatus(turma.start_date, turma.end_date))}
                    </span>
                    {turma.curso?.categoria?.nome && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        {turma.curso.categoria.nome}
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-400">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{formatDate(turma.start_date)} - {formatDate(turma.end_date)}</span>
                    </div>
                    <div className="flex items-center text-gray-400">
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="flex items-center gap-1">
                        {getPeriodIcon(turma.period)}
                        {getPeriodLabel(turma.period)}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-400">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{turma.sala?.nome}</span>
                    </div>
                    <div className="flex items-center text-gray-400">
                      <Users className="h-4 w-4 mr-2" />
                      <span>
                        {turma.cadeiras - (turma.alunos_enrolled?.length || 0)} vagas disponíveis
                        {turma.alunos_enrolled && turma.alunos_enrolled.length > 0 && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({turma.alunos_enrolled.length}/{turma.cadeiras})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center text-teal-accent">
                      {(() => {
                        const faturamentoBruto = turma.cadeiras * (turma.curso?.preco || 0);
                        const custoImpostos = faturamentoBruto * (turma.imposto / 100);
                        const custoProfessores = turma.professores?.reduce((total, prof) => {
                          const professor = professores.find(p => p.id === prof.id);
                          return total + (prof.hours * (professor?.valor_hora || 0));
                        }, 0) || 0;
                        const faturamentoLiquido = faturamentoBruto - custoImpostos - custoProfessores;
                        
                        // Cálculo do faturamento atual (baseado em alunos matriculados)
                        const alunosMatriculados = turma.alunos_enrolled?.length || 0;
                        const faturamentoBrutoAtual = alunosMatriculados * (turma.curso?.preco || 0);
                        const custoImpostosAtual = faturamentoBrutoAtual * (turma.imposto / 100);
                        const faturamentoLiquidoAtual = faturamentoBrutoAtual - custoImpostosAtual - custoProfessores;
                        const valorEmAberto = faturamentoLiquido - faturamentoLiquidoAtual;
                        
                        return (
                          <div className="space-y-2">
                            <div className="flex items-center text-teal-accent">
                              <span className="font-semibold">
                                {formatCurrency(faturamentoLiquido)}
                              </span>
                              <span className="text-xs text-gray-400 ml-2">líquido</span>
                            </div>
                            <div className="text-xs text-gray-400 space-y-1">
                              <div>Bruto: {formatCurrency(faturamentoBruto)}</div>
                              <div>Impostos: -{formatCurrency(custoImpostos)}</div>
                              <div>Professores: -{formatCurrency(custoProfessores)}</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Alunos Interessados */}
                    {turma.alunos_interessados && turma.alunos_interessados.length > 0 && (
                      <div 
                        className={`mt-3 p-3 rounded-lg border w-full col-span-full transition-colors ${
                          (turma.alunos_enrolled?.length || 0) >= turma.cadeiras
                            ? 'bg-gray-500/10 border-gray-500/20 cursor-not-allowed'
                            : 'bg-blue-500/10 border-blue-500/20 cursor-pointer hover:bg-blue-500/15'
                        }`}
                        onClick={() => handleOpenAlunosInteressados(turma)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-blue-400" />
                          <span className="text-blue-400 font-medium text-sm">
                            {turma.alunos_interessados.length} Interessado{turma.alunos_interessados.length > 1 ? 's' : ''}
                          </span>
                          <span className="text-xs text-gray-400 ml-auto">
                            {(turma.alunos_enrolled?.length || 0) >= turma.cadeiras 
                              ? 'Turma lotada' 
                              : 'Clique para ver lista'
                            }
                          </span>
                        </div>
                        <div className="mt-2 text-emerald-400 text-xs font-medium">
                          Potencial: {formatCurrency((turma.curso?.preco || 0) * Math.min(turma.alunos_interessados.length, Math.max(0, turma.cadeiras - (turma.alunos_enrolled?.length || 0))))}
                        </div>
                      </div>
                    )}
                    
                    {/* Alunos Matriculados (Cursando) */}
                    {turma.alunos_enrolled && turma.alunos_enrolled.length > 0 && (
                      <div className="mt-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 w-full">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-yellow-400" />
                          <span className="text-yellow-400 font-medium text-sm">
                            {turma.alunos_enrolled.length} Cursando
                          </span>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {turma.alunos_enrolled.map((aluno) => (
                            <div key={aluno.id} className="flex items-center justify-between gap-2 text-yellow-300 text-xs">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-yellow-400" />
                                <span>{aluno.nome}</span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleCompleteStudent(aluno.id, turma.id, turma.curso_id)}
                                  className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs hover:bg-emerald-500/30 transition-colors"
                                  title="Marcar como concluído"
                                >
                                  Concluir
                                </button>
                                <button
                                  onClick={() => handleUnenrollStudent(aluno.id, turma.curso_id)}
                                  className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors"
                                  title="Remover da turma"
                                >
                                  Remover
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-emerald-400 text-xs font-medium">
                          Faturamento: {formatCurrency((turma.curso?.preco || 0) * turma.alunos_enrolled.length)}
                        </div>
                      </div>
                    )}
                    
                    {/* Alunos Concluídos */}
                    {turma.alunos_completed && turma.alunos_completed.length > 0 && (
                      <div className="mt-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-emerald-400" />
                          <span className="text-emerald-400 font-medium text-sm">
                            {turma.alunos_completed.length} Concluído{turma.alunos_completed.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-1 max-h-20 overflow-y-auto">
                          {turma.alunos_completed.map((aluno) => (
                            <div key={aluno.id} className="flex items-center gap-2 text-emerald-300 text-xs">
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span>{aluno.nome}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-emerald-400 text-xs font-medium">
                          Concluído: {formatCurrency((turma.curso?.preco || 0) * turma.alunos_completed.length)}
                        </div>
                      </div>
                    )}
                    
                    {turma.professores && turma.professores.length > 0 && (
                      <div className="mt-3">
                        <p className="text-gray-400 text-sm mb-1">Professores:</p>
                        <div className="space-y-1">
                          {turma.professores.map((prof) => (
                            <div key={prof.id} className="text-white text-sm">
                              {prof.nome} ({prof.hours}h)
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Valor em aberto */}
                    {(() => {
                      const faturamentoBruto = turma.cadeiras * (turma.curso?.preco || 0);
                      const custoImpostos = faturamentoBruto * (turma.imposto / 100);
                      const custoProfessores = turma.professores?.reduce((total, prof) => {
                        const professor = professores.find(p => p.id === prof.id);
                        return total + (prof.hours * (professor?.valor_hora || 0));
                      }, 0) || 0;
                      const faturamentoLiquido = faturamentoBruto - custoImpostos - custoProfessores;
                      
                      const alunosMatriculados = turma.alunos_enrolled?.length || 0;
                      const faturamentoBrutoAtual = alunosMatriculados * (turma.curso?.preco || 0);
                      const custoImpostosAtual = faturamentoBrutoAtual * (turma.imposto / 100);
                      const faturamentoLiquidoAtual = faturamentoBrutoAtual - custoImpostosAtual - custoProfessores;
                      const valorEmAberto = faturamentoLiquido - faturamentoLiquidoAtual;
                      
                      return valorEmAberto > 0 ? (
                        <div className="mt-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-orange-400 font-medium text-sm">
                              Valor em Aberto
                            </span>
                          </div>
                          <div className="text-orange-300 font-semibold">
                            {formatCurrency(valorEmAberto)}
                          </div>
                          <div className="text-xs text-orange-400/70 mt-1">
                            Falta para atingir o lucro líquido potencial
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
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
            </div>
          ))}
          {filteredTurmas.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-8">
              {turmas.length === 0 ? 'Nenhuma turma cadastrada' : 'Nenhuma turma encontrada com os filtros aplicados'}
            </div>
          )}
        </div>

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
          onStudentEnrolled={loadData}
        />
      </div>

      {/* Calendário de Ocupação das Salas */}
      <div className="mt-12">
        <CalendarOcupacaoSalas 
          salas={salas}
          turmas={turmas}
        />
      </div>
    </div>
  );
}