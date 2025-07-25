import { createPortal } from 'react-dom';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2, BookOpen, Clock, Check, ArrowUpDown, Filter, TrendingUp, Sun, Sunset, Moon, X, Users, CheckSquare, Square, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ModalAluno } from '../components/ModalAluno';
import { ModalBulkEdit } from '../components/ModalBulkEdit';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Tipos para ordenação e filtros
 */
type SortField = 'created_at' | 'nome';
import { monitoredQuery } from '../utils/performance';
type SortDirection = 'asc' | 'desc';
type Period = 'manha' | 'tarde' | 'noite';

/**
 * Configuração dos períodos disponíveis
 */
const PERIODS: { value: Period; label: string; icon: typeof Sun }[] = [
  { value: 'manha', label: 'Manhã', icon: Sun },
  { value: 'tarde', label: 'Tarde', icon: Sunset },
  { value: 'noite', label: 'Noite', icon: Moon }
];

/**
 * Configuração da paginação
 */
const ITEMS_PER_PAGE = 20;

/**
 * Interface para interesse de aluno em curso
 */
interface CursoInterest {
  id?: string;
  curso_id: string;
  status: 'interested' | 'enrolled' | 'completed';
}

/**
 * Interface principal do aluno com relacionamentos
 */
interface Aluno {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  empresa?: string;
  available_periods?: Period[];
  curso_interests?: CursoInterest[];
  created_at: string;
}

/**
 * Interface para dados de curso
 */
interface Curso {
  id: string;
  nome: string;
  preco: number;
}

/**
 * Componente principal da página de Alunos
 * 
 * Funcionalidades:
 * - Listagem de alunos com filtros avançados
 * - Gestão de interesses em cursos
 * - Cálculo de faturamento potencial
 * - Controle de status (interessado/matriculado/concluído)
 * - Busca e ordenação
 * - Paginação para melhor performance
 */
export function Alunos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [totalOpenRevenue, setTotalOpenRevenue] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterInterestStatus, setFilterInterestStatus] = useState<CursoInterest['status'] | 'all' | 'no_interest'>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    empresa: '',
    available_periods: [] as Period[]
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    alunoId: '',
    alunoNome: ''
  });
  const [courseModal, setCourseModal] = useState({
    isOpen: false,
    aluno: null as Aluno | null
  });

  /**
   * Calcula o número total de páginas
   */
  const totalPages = Math.ceil(totalStudents / ITEMS_PER_PAGE);

  /**
   * Alterna a seleção de um período de disponibilidade
   */
  function togglePeriod(period: Period) {
    const currentPeriods = formData.available_periods;
    const isSelected = currentPeriods.includes(period);
    
    if (isSelected) {
      setFormData({
        ...formData,
        available_periods: currentPeriods.filter(p => p !== period)
      });
    } else {
      setFormData({
        ...formData,
        available_periods: [...currentPeriods, period]
      });
    }
  }

  /**
   * Fecha o modal e limpa o formulário
   */
  function handleCloseModal() {
    setIsModalOpen(false);
    setFormData({
      nome: '',
      email: '',
      whatsapp: '',
      empresa: '',
      available_periods: []
    });
    setEditingId(null);
  }

  /**
   * Calcula o faturamento potencial baseado em alunos interessados
   * 
   * Considera apenas alunos com status 'interested'
   * 
   * @param alunosData - Lista de alunos
   * @param cursosData - Lista de cursos com preços
   * @returns Valor total do faturamento potencial
   */
  function calculateOpenRevenue(alunosData: Aluno[], cursosData: Curso[]): number {
    let total = 0;
    
    alunosData.forEach(aluno => {
      aluno.curso_interests?.forEach(interest => {
        // Only count students who are interested (not enrolled or completed)
        if (interest.status === 'interested') {
          const curso = cursosData.find(c => c.id === interest.curso_id);
          if (curso) {
            total += curso.preco;
          }
        }
      });
    });
    
    return total;
  }

  /**
   * Carrega dados iniciais da página
   */
  useEffect(() => {
    loadData(1);
  }, []);

  /**
   * Recarrega dados quando filtros mudam, resetando para a primeira página
   */
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      loadData(1);
    }
  }, [searchTerm, filterInterestStatus, selectedCourseId, sortField, sortDirection]);

  /**
   * Carrega dados quando a página atual muda
   */
  useEffect(() => {
    loadData(currentPage);
  }, [currentPage]);

  // Handle URL parameters on component mount
  useEffect(() => {
    const cursoParam = searchParams.get('curso');
    const statusParam = searchParams.get('status');
    
    if (cursoParam) {
      setSelectedCourseId(cursoParam);
    }
    
    if (statusParam && (statusParam === 'interested' || statusParam === 'enrolled' || statusParam === 'completed')) {
      setFilterInterestStatus(statusParam as CursoInterest['status']);
    }
  }, [searchParams]);

  // Update modal data when alunos data changes
  useEffect(() => {
    if (courseModal.isOpen && courseModal.aluno) {
      const updatedAluno = alunos.find(a => a.id === courseModal.aluno!.id);
      if (updatedAluno && JSON.stringify(updatedAluno.curso_interests) !== JSON.stringify(courseModal.aluno.curso_interests)) {
        setCourseModal({
          ...courseModal,
          aluno: updatedAluno
        });
      }
    }
  }, [alunos, courseModal.isOpen, courseModal.aluno]);

  /**
   * Carrega alunos e cursos do banco de dados com paginação
   * Calcula faturamento potencial automaticamente
   * 
   * @param page - Número da página a ser carregada
   */
  async function loadData(page: number = 1) {
    setLoading(true);
    try {
      // Buscar cursos primeiro
      const cursosResult = await monitoredQuery('load-cursos-for-pricing', () =>
        supabase
        .from('cursos')
        .select('id, nome, preco')
        .order('nome')
      );

      if (cursosResult.error) throw cursosResult.error;
      setCursos(cursosResult.data);

      // Construir query para alunos com filtros aplicados no backend
      let alunosQuery;
      
      if (filterInterestStatus === 'no_interest') {
        // Para alunos sem interesse, buscar alunos que não têm registros em aluno_curso_interests
        alunosQuery = supabase
          .from('alunos')
          .select(`
            id,
            nome,
            email,
            whatsapp,
            empresa,
            available_periods,
            created_at
          `, { count: 'exact' })
          .not('id', 'in', `(
            SELECT DISTINCT aluno_id 
            FROM aluno_curso_interests 
            WHERE aluno_id IS NOT NULL
          )`);
      } else if (filterInterestStatus !== 'all') {
        // Para filtros específicos de status, usar join com aluno_curso_interests
        let interestQuery = supabase
          .from('aluno_curso_interests')
          .select(`
            aluno_id,
            aluno:alunos!inner(
              id,
              nome,
              email,
              whatsapp,
              empresa,
              available_periods,
              created_at
            )
          `, { count: 'exact' })
          .eq('status', filterInterestStatus);

        // Aplicar filtro por curso se selecionado
        if (selectedCourseId) {
          interestQuery = interestQuery.eq('curso_id', selectedCourseId);
        }

        const interestResult = await monitoredQuery('load-alunos-by-interest-status', () => interestQuery);
        if (interestResult.error) throw interestResult.error;

        // Extrair alunos únicos dos resultados
        const uniqueAlunos = new Map();
        interestResult.data.forEach(item => {
          if (item.aluno && !uniqueAlunos.has(item.aluno.id)) {
            uniqueAlunos.set(item.aluno.id, item.aluno);
          }
        });

        const alunosData = Array.from(uniqueAlunos.values());
        
        // Aplicar filtros de busca no frontend (para esta query específica)
        let filteredAlunos = alunosData;
        if (searchTerm) {
          filteredAlunos = alunosData.filter(aluno =>
            aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            aluno.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            aluno.whatsapp.includes(searchTerm)
          );
        }

        // Aplicar ordenação
        filteredAlunos.sort((a, b) => {
          if (sortField === 'created_at') {
            return sortDirection === 'desc' 
              ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          } else {
            return sortDirection === 'desc'
              ? b.nome.localeCompare(a.nome)
              : a.nome.localeCompare(b.nome);
          }
        });

        // Aplicar paginação manual
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE;
        const paginatedAlunos = filteredAlunos.slice(from, to);

        // Buscar interesses para os alunos da página atual
        const alunosIds = paginatedAlunos.map(a => a.id);
        const interessesResult = await supabase
          .from('aluno_curso_interests')
          .select('id, curso_id, status, aluno_id')
          .in('aluno_id', alunosIds);

        // Adicionar interesses aos alunos
        const alunosComInteresses = paginatedAlunos.map(aluno => ({
          ...aluno,
          curso_interests: interessesResult.data?.filter(i => i.aluno_id === aluno.id) || []
        }));

        setAlunos(alunosComInteresses);
        setTotalStudents(filteredAlunos.length);
        await calculateTotalOpenRevenue(cursosResult.data);
        return;
      } else {
        // Para "todos", buscar todos os alunos
        alunosQuery = supabase
          .from('alunos')
          .select(`
            id,
            nome,
            email,
            whatsapp,
            empresa,
            available_periods,
            created_at,
            curso_interests:aluno_curso_interests(
              id,
              curso_id,
              status
            )
          `, { count: 'exact' });
      }

      // Aplicar filtros de busca
      if (searchTerm) {
        alunosQuery = alunosQuery.or(`nome.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,whatsapp.ilike.%${searchTerm}%`);
      }

      // Aplicar ordenação
      if (sortField === 'created_at') {
        alunosQuery = alunosQuery.order('created_at', { ascending: sortDirection === 'asc' });
      } else {
        alunosQuery = alunosQuery.order('nome', { ascending: sortDirection === 'asc' });
      }

      // Aplicar paginação
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      alunosQuery = alunosQuery.range(from, to);

      const alunosResult = await monitoredQuery('load-alunos-with-interests-paginated', () => alunosQuery);
      if (alunosResult.error) throw alunosResult.error;

      const alunosData = alunosResult.data.map(aluno => ({
        ...aluno,
        curso_interests: aluno.curso_interests || []
      }));

      setAlunos(alunosData);
      setTotalStudents(alunosResult.count || 0);

      // Calcular faturamento potencial de todos os alunos (não apenas da página atual)
      await calculateTotalOpenRevenue(cursosResult.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Calcula o faturamento potencial total (de todos os alunos, não apenas da página atual)
   */
  async function calculateTotalOpenRevenue(cursosData: Curso[]) {
    try {
      let query = supabase
        .from('aluno_curso_interests')
        .select('curso_id, status')
        .eq('status', 'interested');

      // Aplicar filtro por curso se selecionado
      if (selectedCourseId && filterInterestStatus === 'interested') {
        query = query.eq('curso_id', selectedCourseId);
      }

      const { data: allInterests, error } = await query;
      if (error) throw error;

      let total = 0;
      allInterests.forEach(interest => {
        const curso = cursosData.find(c => c.id === interest.curso_id);
        if (curso) {
          total += curso.preco;
        }
      });

      setTotalOpenRevenue(total);
    } catch (error) {
      console.error('Erro ao calcular faturamento potencial:', error);
    }
  }

  /**
   * Aplica filtros de interesse nos dados dos alunos
   * DEPRECATED: Agora os filtros são aplicados no backend
   */
  function applyInterestFilters(alunosData: Aluno[]): Aluno[] {
    // Esta função não é mais usada, mas mantida para compatibilidade
    return alunosData;
  }

  /**
   * Ordena lista de alunos por campo e direção especificados
   * DEPRECATED: Agora a ordenação é feita no backend
   */
  function sortAlunos(alunosToSort: Aluno[], field: SortField, direction: SortDirection): Aluno[] {
    // Esta função não é mais usada, mas mantida para compatibilidade
    return alunosToSort;
  }

  /**
   * Gerencia mudança de ordenação
   * Alterna direção se o mesmo campo for clicado novamente
   */
  function handleSort(field: SortField) {
    const newDirection = field === sortField && sortDirection === 'desc' ? 'asc' : 'desc';
    setSortField(field);
    setSortDirection(newDirection);
    setCurrentPage(1); // Reset para primeira página ao ordenar
  }

  /**
   * Navega para uma página específica
   */
  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }

  /**
   * Gera array de números de página para exibição
   */
  function getPageNumbers(): number[] {
    const delta = 2; // Número de páginas para mostrar antes e depois da atual
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, -1); // -1 representa "..."
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push(-1, totalPages); // -1 representa "..."
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  }
        monitoredQuery('load-cursos-for-pricing', () =>
          supabase
          .from('cursos')
          .select('id, nome, preco')
          .order('nome')
        )
      ]);

      if (alunosResult.error) throw alunosResult.error;
      if (cursosResult.error) throw cursosResult.error;

      const alunosData = alunosResult.data.map(aluno => ({
        ...aluno,
        curso_interests: aluno.curso_interests || []
      }));

      // Aplicar filtros de interesse no frontend (pois são complexos para o Supabase)
      const filteredAlunosData = applyInterestFilters(alunosData);

      setAlunos(filteredAlunosData);
      setCursos(cursosResult.data);
      setTotalStudents(alunosResult.count || 0);

      // Calcular faturamento potencial de todos os alunos (não apenas da página atual)
      await calculateTotalOpenRevenue(cursosResult.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Calcula o faturamento potencial total (de todos os alunos, não apenas da página atual)
   */
  async function calculateTotalOpenRevenue(cursosData: Curso[]) {
    try {
      const { data: allInterests, error } = await supabase
        .from('aluno_curso_interests')
        .select('curso_id, status')
        .eq('status', 'interested');

      if (error) throw error;

      let total = 0;
      allInterests.forEach(interest => {
        const curso = cursosData.find(c => c.id === interest.curso_id);
        if (curso) {
          total += curso.preco;
        }
      });

      setTotalOpenRevenue(total);
    } catch (error) {
      console.error('Erro ao calcular faturamento potencial:', error);
    }
  }

  /**
   * Aplica filtros de interesse nos dados dos alunos
   */
  function applyInterestFilters(alunosData: Aluno[]): Aluno[] {
    if (filterInterestStatus === 'all') {
      return alunosData;
    }

    return alunosData.filter(aluno => {
      if (filterInterestStatus === 'no_interest') {
        return !aluno.curso_interests || aluno.curso_interests.length === 0;
      } else {
        if (selectedCourseId) {
          return aluno.curso_interests?.some(interest => 
            interest.curso_id === selectedCourseId && interest.status === filterInterestStatus
          ) || false;
        } else {
          return aluno.curso_interests?.some(interest => 
            interest.status === filterInterestStatus
          ) || false;
        }
      }
    });
  }

  /**
   * Ordena lista de alunos por campo e direção especificados
   */
  function sortAlunos(alunosToSort: Aluno[], field: SortField, direction: SortDirection): Aluno[] {
    return [...alunosToSort].sort((a, b) => {
      if (field === 'created_at') {
        return direction === 'desc' 
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        return direction === 'desc'
          ? b.nome.localeCompare(a.nome)
          : a.nome.localeCompare(b.nome);
      }
    });
  }

  /**
   * Gerencia mudança de ordenação
   * Alterna direção se o mesmo campo for clicado novamente
   */
  function handleSort(field: SortField) {
    const newDirection = field === sortField && sortDirection === 'desc' ? 'asc' : 'desc';
    setSortField(field);
    setSortDirection(newDirection);
    setCurrentPage(1); // Reset para primeira página ao ordenar
  }

  /**
   * Navega para uma página específica
   */
  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }

  /**
   * Gera array de números de página para exibição
   */
  function getPageNumbers(): number[] {
    const delta = 2; // Número de páginas para mostrar antes e depois da atual
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, -1); // -1 representa "..."
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push(-1, totalPages); // -1 representa "..."
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  }

  /**
   * Alterna o modo de seleção múltipla
   */
  function toggleSelectionMode() {
    setIsSelectionMode(!isSelectionMode);
    setSelectedStudents(new Set());
  }

  /**
   * Alterna a seleção de um aluno específico
   */
  function toggleStudentSelection(studentId: string) {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudents(newSelection);
  }

  /**
   * Seleciona todos os alunos visíveis na página atual
   */
  function selectAllStudents() {
    const allStudentIds = new Set(alunos.map(aluno => aluno.id));
    setSelectedStudents(allStudentIds);
  }

  /**
   * Desmarca todos os alunos selecionados
   */
  function clearSelection() {
    setSelectedStudents(new Set());
  }

  /**
   * Abre o modal de edição em lote
   */
  function handleBulkEdit() {
    if (selectedStudents.size === 0) {
      toast.error('Selecione pelo menos um aluno para editar');
      return;
    }
    setIsBulkEditModalOpen(true);
  }

  /**
   * Fecha o modal de edição em lote
   */
  function handleCloseBulkEdit() {
    setIsBulkEditModalOpen(false);
  }

  /**
   * Callback executado após operação em lote bem-sucedida
   */
  function handleBulkEditSuccess() {
    setSelectedStudents(new Set());
    setIsSelectionMode(false);
    loadData(currentPage);
  }

  /**
   * Submete formulário de criação/edição de aluno
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        const result = await monitoredQuery('update-aluno', () =>
          supabase
            .from('alunos')
            .update(formData)
            .eq('id', editingId)
        );
        
        if (result.error) throw result.error;
        toast.success('Aluno atualizado com sucesso!');
      } else {
        const result = await monitoredQuery('create-aluno', () =>
          supabase
            .from('alunos')
            .insert([formData])
        );
        
        if (result.error) throw result.error;
        toast.success('Aluno adicionado com sucesso!');
      }

      setIsModalOpen(false);
      setFormData({
        nome: '',
        email: '',
        whatsapp: '',
        empresa: '',
        available_periods: []
      });
      setEditingId(null);
      loadData(currentPage);
    } catch (error) {
      toast.error('Erro ao salvar aluno');
    }
  }

  /**
   * Atualiza o status de interesse de um aluno em um curso
   * 
   * @param alunoId - ID do aluno
   * @param cursoId - ID do curso
   * @param status - Novo status do interesse
   */
  async function handleStatusChange(alunoId: string, cursoId: string, status: CursoInterest['status']) {
    try {
      // Check if interest already exists
      const existingInterestResult = await monitoredQuery('check-existing-interest', () =>
        supabase
          .from('aluno_curso_interests')
          .select('id')
          .eq('aluno_id', alunoId)
          .eq('curso_id', cursoId)
          .maybeSingle()
      );

      if (existingInterestResult.data) {
        // Update existing interest
        const result = await monitoredQuery('update-interest-status', () =>
          supabase
            .from('aluno_curso_interests')
            .update({ status })
            .eq('aluno_id', alunoId)
            .eq('curso_id', cursoId)
        );
        
        if (result.error) throw result.error;
      } else {
        // Create new interest
        const result = await monitoredQuery('create-interest', () =>
          supabase
            .from('aluno_curso_interests')
            .insert([{
              aluno_id: alunoId,
              curso_id: cursoId,
              status
            }])
        );
        
        if (result.error) throw result.error;
      }

      toast.success('Status atualizado com sucesso!');
      await loadData(currentPage);
      
      // Update the modal state with fresh data
      if (courseModal.aluno) {
        const updatedAluno = alunos.find(a => a.id === courseModal.aluno!.id);
        if (updatedAluno) {
          setCourseModal({
            ...courseModal,
            aluno: updatedAluno
          });
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  }

  /**
   * Remove completamente o interesse de um aluno em um curso
   */
  async function handleRemoveInterest(alunoId: string, cursoId: string) {
    try {
      const result = await monitoredQuery('remove-interest', () =>
        supabase
          .from('aluno_curso_interests')
          .delete()
          .eq('aluno_id', alunoId)
          .eq('curso_id', cursoId)
      );
      
      if (result.error) throw result.error;
      toast.success('Interesse removido com sucesso!');
      await loadData(currentPage);
      
      // Update the modal state with fresh data
      if (courseModal.aluno) {
        const updatedAluno = alunos.find(a => a.id === courseModal.aluno!.id);
        if (updatedAluno) {
          setCourseModal({
            ...courseModal,
            aluno: updatedAluno
          });
        }
      }
    } catch (error) {
      console.error('Error removing interest:', error);
      toast.error('Erro ao remover interesse');
    }
  }

  /**
   * Inicia processo de exclusão de aluno
   */
  async function handleDelete(id: string) {
    const aluno = alunos.find(a => a.id === id);
    if (!aluno) return;

    setConfirmModal({
      isOpen: true,
      alunoId: id,
      alunoNome: aluno.nome
    });
  }

  /**
   * Confirma e executa exclusão do aluno
   */
  async function handleConfirmDelete() {
    try {
      const result = await monitoredQuery('delete-aluno', () =>
        supabase
          .from('alunos')
          .delete()
          .eq('id', confirmModal.alunoId)
      );
      
      if (result.error) throw result.error;
      toast.success('Aluno excluído com sucesso!');
      loadData(currentPage);
    } catch (error) {
      toast.error('Erro ao excluir aluno');
    } finally {
      setConfirmModal({ isOpen: false, alunoId: '', alunoNome: '' });
    }
  }

  /**
   * Cancela exclusão do aluno
   */
  function handleCancelDelete() {
    setConfirmModal({ isOpen: false, alunoId: '', alunoNome: '' });
  }

  /**
   * Abre modal para gerenciar cursos do aluno
   */
  function handleOpenCourseModal(aluno: Aluno) {
    console.log('Opening course modal for:', aluno.nome); // Debug log
    setCourseModal({
      isOpen: true,
      aluno: aluno
    });
  }

  /**
   * Fecha modal de gerenciamento de cursos
   */
  function handleCloseCourseModal() {
    console.log('Closing course modal'); // Debug log
    setCourseModal({
      isOpen: false,
      aluno: null
    });
  }

  /**
   * Prepara formulário para edição de aluno existente
   */
  function handleEdit(aluno: Aluno) {
    setFormData({
      nome: aluno.nome,
      email: aluno.email || '',
      whatsapp: aluno.whatsapp,
      empresa: aluno.empresa || '',
      available_periods: aluno.available_periods || []
    });
    setEditingId(aluno.id);
    setIsModalOpen(true);
  }

  /**
   * Retorna ícone correspondente ao período
   */
  function getPeriodIcon(period: Period) {
    const periodConfig = PERIODS.find(p => p.value === period);
    const Icon = periodConfig?.icon || Sun;
    return <Icon className="h-4 w-4" />;
  }

  /**
   * Retorna label em português do período
   */
  function getPeriodLabel(period: Period) {
    return PERIODS.find(p => p.value === period)?.label || '';
  }

  /**
   * Formata data para exibição
   */
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Opções de filtro por status de interesse
   */
  const filterOptions: Array<{ value: CursoInterest['status'] | 'all' | 'no_interest'; label: string; icon: any }> = [
    { value: 'all' as const, label: 'Todos', icon: Filter },
    { value: 'interested' as const, label: 'Interessados', icon: BookOpen },
    { value: 'enrolled' as const, label: 'Cursando', icon: Clock },
    { value: 'completed' as const, label: 'Concluídos', icon: Check },
    { value: 'no_interest' as const, label: 'Sem Interesse', icon: X }
  ];

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 fade-in-delay-1">
          <div className="slide-in-left">
            <h1 className="text-3xl font-bold text-white">Alunos</h1>
            <p className="text-gray-400 mt-2">Gerencie seus alunos e acompanhe o progresso nos cursos</p>
          </div>
          <div className="flex items-center gap-3 slide-in-right">
            <button
              onClick={toggleSelectionMode}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors hover-glow ${
                isSelectionMode 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {isSelectionMode ? <CheckSquare className="h-5 w-5 mr-2" /> : <Square className="h-5 w-5 mr-2" />}
              {isSelectionMode ? 'Cancelar Seleção' : 'Selecionar Múltiplos'}
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center px-4 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors hover-glow"
            >
              <Plus className="h-5 w-5 mr-2" />
              Novo Aluno
            </button>
          </div>
        </div>

        <div className="mb-6 scale-in">
          <div className="bg-dark-card rounded-2xl p-6 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Faturamento Potencial em Aberto</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalOpenRevenue)}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-gray-400 text-sm">
                    Valor total dos cursos com alunos interessados
                  </p>
                </div>
              </div>
              <div className="bg-teal-accent p-3 rounded-xl">
                <TrendingUp className="h-6 w-6 text-dark" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-4 scale-in-delay-1">
          <div>
            <input
              type="text"
              placeholder="Buscar alunos..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset para primeira página ao buscar
              }}
              className="w-full max-w-md bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Filtrar por curso
            </label>
            <select
              value={selectedCourseId || ''}
              onChange={(e) => {
                const newCourseId = e.target.value || null;
                setSelectedCourseId(newCourseId);
                setCurrentPage(1); // Reset para primeira página ao filtrar
                
                // Update URL params
                const newParams = new URLSearchParams(searchParams);
                if (newCourseId) {
                  newParams.set('curso', newCourseId);
                } else {
                  newParams.delete('curso');
                }
                setSearchParams(newParams);
              }}
              disabled={filterInterestStatus === 'no_interest'}
              className="w-full max-w-md bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
            >
              <option value="">Todos os cursos</option>
              {cursos.map(curso => (
                <option key={curso.id} value={curso.id}>
                  {curso.nome}
                </option>
              ))}
            </select>
            {filterInterestStatus === 'no_interest' && (
              <p className="text-xs text-gray-500 mt-1">
                Filtro por curso desabilitado para alunos sem interesse
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Filtrar por status de interesse
            </label>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    setFilterInterestStatus(option.value);
                    setCurrentPage(1); // Reset para primeira página ao filtrar
                    
                    // Update URL params
                    const newParams = new URLSearchParams(searchParams);
                    if (option.value !== 'all') {
                      newParams.set('status', option.value);
                    } else {
                      newParams.delete('status');
                    }
                    
                    // Clear course filter when selecting "no_interest"
                    if (option.value === 'no_interest') {
                      setSelectedCourseId(null);
                      newParams.delete('curso');
                    }
                    
                    setSearchParams(newParams);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    filterInterestStatus === option.value
                      ? 'bg-teal-accent text-dark'
                      : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark-card'
                  }`}
                >
                  <option.icon className="h-4 w-4" />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4 scale-in-delay-1">
          <div className="flex items-center justify-between bg-dark-lighter rounded-lg px-4 py-3 border border-gray-700">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-teal-accent" />
              <span className="text-white font-medium">
                {totalStudents} aluno{totalStudents !== 1 ? 's' : ''} 
                {searchTerm || filterInterestStatus !== 'all' || selectedCourseId ? ' encontrado' : ' cadastrado'}{totalStudents !== 1 ? 's' : ''}
              </span>
              {isSelectionMode && (
                <span className="text-blue-400 font-medium">
                  • {selectedStudents.size} selecionado{selectedStudents.size !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {isSelectionMode && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllStudents}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Selecionar Todos
                  </button>
                  <span className="text-gray-500">|</span>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    Limpar Seleção
                  </button>
                  {selectedStudents.size > 0 && (
                    <>
                      <span className="text-gray-500">|</span>
                      <button
                        onClick={handleBulkEdit}
                        className="flex items-center gap-1 text-sm bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition-colors"
                      >
                        <Edit3 className="h-3 w-3" />
                        Editar Selecionados
                      </button>
                    </>
                  )}
                </div>
              )}
              {totalPages > 1 && (
                <span className="text-gray-400 text-sm">
                  Página {currentPage} de {totalPages}
                </span>
              )}
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-teal-accent border-t-transparent"></div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-dark-card rounded-2xl overflow-hidden scale-in-delay-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  {isSelectionMode && (
                    <th className="text-left p-4 w-12">
                      <button
                        onClick={selectedStudents.size === alunos.length ? clearSelection : selectAllStudents}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {selectedStudents.size === alunos.length && alunos.length > 0 ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                  )}
                  <th className="text-left p-4">
                    <button
                      onClick={() => handleSort('nome')}
                      className="flex items-center text-gray-400 font-medium hover:text-white transition-colors"
                    >
                      Nome
                      <ArrowUpDown className={`ml-2 h-4 w-4 ${sortField === 'nome' ? 'text-teal-accent' : ''}`} />
                    </button>
                  </th>
                  <th className="text-left p-4 text-gray-400 font-medium">Contato</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Horários Disponíveis</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Cursos</th>
                  <th className="text-right p-4 text-gray-400 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno) => (
                  <tr key={aluno.id} className="border-b border-gray-700/50">
                    {isSelectionMode && (
                      <td className="p-4">
                        <button
                          onClick={() => toggleStudentSelection(aluno.id)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {selectedStudents.has(aluno.id) ? (
                            <CheckSquare className="h-4 w-4 text-blue-400" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="p-4">
                      <span className="text-white font-medium">{aluno.nome}</span>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="text-gray-400">{aluno.email}</div>
                        <div className="text-gray-400">{aluno.whatsapp}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {(aluno.available_periods || []).map(period => (
                          <div
                            key={period}
                            className="flex items-center gap-1 px-2 py-1 bg-teal-accent/20 text-teal-accent rounded-lg text-xs"
                          >
                            {getPeriodIcon(period)}
                            <span>{getPeriodLabel(period)}</span>
                          </div>
                        ))}
                        {(!aluno.available_periods || aluno.available_periods.length === 0) && (
                          <span className="text-gray-400 text-sm">Não informado</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleOpenCourseModal(aluno)}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-accent/20 text-teal-accent rounded-lg hover:bg-teal-accent/30 transition-colors"
                      >
                        <BookOpen className="h-4 w-4" />
                        <span>Gerenciar Cursos</span>
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(aluno)}
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(aluno.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {alunos.length === 0 && !loading && (
                  <tr>
                    <td colSpan={isSelectionMode ? 6 : 5} className="text-center py-8 text-gray-400">
                      Nenhum aluno encontrado
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={isSelectionMode ? 6 : 5} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-gray-400">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-teal-accent border-t-transparent"></div>
                        <span>Carregando alunos...</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Controles de Paginação */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between bg-dark-card rounded-2xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span>
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, totalStudents)} de {totalStudents} alunos
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Botão Anterior */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  currentPage === 1
                    ? 'text-gray-500 cursor-not-allowed'
                    : 'text-gray-400 hover:text-white hover:bg-dark-lighter'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Anterior</span>
              </button>

              {/* Números das páginas */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((pageNum, index) => (
                  <React.Fragment key={index}>
                    {pageNum === -1 ? (
                      <span className="px-3 py-2 text-gray-500">...</span>
                    ) : (
                      <button
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-teal-accent text-dark font-medium'
                            : 'text-gray-400 hover:text-white hover:bg-dark-lighter'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Botão Próximo */}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  currentPage === totalPages
                    ? 'text-gray-500 cursor-not-allowed'
                    : 'text-gray-400 hover:text-white hover:bg-dark-lighter'
                }`}
              >
                <span>Próximo</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <ModalAluno
          isOpen={isModalOpen}
          editingId={editingId}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={handleCloseModal}
          togglePeriod={togglePeriod}
        />

        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title="Excluir Aluno"
          message={`Tem certeza que deseja excluir o aluno "${confirmModal.alunoNome}"? Esta ação não pode ser desfeita e removerá todos os dados relacionados.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          variant="danger"
        />

        {/* Modal de Gerenciamento de Cursos */}
        {courseModal.isOpen && courseModal.aluno && createPortal(
          <div 
            className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
            onClick={handleCloseCourseModal}
          >
            <div 
              className="bg-dark-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">Gerenciar Cursos</h2>
                  <p className="text-gray-400 mt-1">{courseModal.aluno.nome}</p>
                </div>
                <button
                  onClick={handleCloseCourseModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {cursos.map(curso => {
                  const interest = courseModal.aluno?.curso_interests?.find(
                    ci => ci.curso_id === curso.id
                  );
                  
                  return (
                    <div key={curso.id} className="bg-dark-lighter rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white font-medium">{curso.nome}</h3>
                          <p className="text-gray-400 text-sm">{formatCurrency(curso.preco)}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (courseModal.aluno) {
                                handleStatusChange(courseModal.aluno.id, curso.id, 'interested');
                              }
                            }}
                            className={`p-2 rounded-md transition-colors ${
                              interest?.status === 'interested'
                                ? 'bg-blue-500 text-white'
                                : 'bg-dark text-gray-400 hover:text-white'
                            }`}
                            title="Interessado"
                          >
                            <BookOpen className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (courseModal.aluno) {
                                handleStatusChange(courseModal.aluno.id, curso.id, 'enrolled');
                              }
                            }}
                            className={`p-2 rounded-md transition-colors ${
                              interest?.status === 'enrolled'
                                ? 'bg-yellow-500 text-white'
                                : 'bg-dark text-gray-400 hover:text-white'
                            }`}
                            title="Cursando"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (courseModal.aluno) {
                                handleStatusChange(courseModal.aluno.id, curso.id, 'completed');
                              }
                            }}
                            className={`p-2 rounded-md transition-colors ${
                              interest?.status === 'completed'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-dark text-gray-400 hover:text-white'
                            }`}
                            title="Concluído"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          {interest && (
                            <button
                              type="button"
                              onClick={() => {
                                if (courseModal.aluno) {
                                  handleRemoveInterest(courseModal.aluno.id, curso.id);
                                }
                              }}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                              title="Remover"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      {interest && (
                        <div className="mt-2 text-xs text-gray-400">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            interest.status === 'interested' ? 'bg-blue-500/20 text-blue-400' :
                            interest.status === 'enrolled' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                          {interest.status === 'interested' && <BookOpen className="h-3 w-3" />}
                          {interest.status === 'enrolled' && <Clock className="h-3 w-3" />}
                          {interest.status === 'completed' && <Check className="h-3 w-3" />}
                          {
                            interest.status === 'interested' ? 'Interessado' :
                            interest.status === 'enrolled' ? 'Cursando' :
                            'Concluído'
                          }
                          </div>
                        </div>
                      )}
                      {!interest && (
                        <div className="mt-2 text-xs text-gray-500">
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-700/30">
                            Sem interesse registrado
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      <ModalBulkEdit
        isOpen={isBulkEditModalOpen}
        onClose={handleCloseBulkEdit}
        selectedStudentIds={Array.from(selectedStudents)}
        cursos={cursos}
        onSuccess={handleBulkEditSuccess}
      />
    </div>
  );
}