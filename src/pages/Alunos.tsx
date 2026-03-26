import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2, Search, Users, TrendingUp, Filter, CheckSquare, Square, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, formatPhone } from '../utils/format';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ModalAluno } from '../components/ModalAluno';
import { ModalCursosInteresse } from '../components/ModalCursosInteresse';
import { ModalBulkEdit } from '../components/ModalBulkEdit';
import { useSearchParams } from 'react-router-dom';
import { useUnidade } from '../contexts/UnidadeContext';

type Period = 'manha' | 'tarde' | 'noite';
type InterestStatus = 'interested' | 'enrolled' | 'completed';

interface Aluno {
  id: string;
  nome: string;
  email?: string;
  whatsapp: string;
  empresa?: string;
  available_periods?: Period[];
  created_at: string;
  curso_interests?: Array<{
    id: string;
    curso_id: string;
    status: InterestStatus;
    curso?: {
      id: string;
      nome: string;
      preco: number;
    };
  }>;
  unidade_id?: string;
  unidade_nome?: string;
}

interface Curso {
  id: string;
  nome: string;
  preco: number;
}

interface Unidade {
  id: string;
  nome: string;
}

const ITEMS_PER_PAGE = 20;

export function Alunos() {
  const { selectedUnidadeId } = useUnidade();
  const [searchParams, setSearchParams] = useSearchParams();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InterestStatus | 'none'>('all');
  const [cursoFilter, setCursoFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cursosInteresseModal, setCursosInteresseModal] = useState({
    isOpen: false,
    alunoId: '',
    alunoNome: ''
  });
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    empresa: '',
    available_periods: [] as Period[],
    unidade_id: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    alunoId: '',
    alunoNome: ''
  });

  // Bulk selection states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [bulkEditModal, setBulkEditModal] = useState(false);

  useEffect(() => {
    // Initialize filters from URL params
    const curso = searchParams.get('curso');
    const status = searchParams.get('status') as InterestStatus;
    
    if (curso) setCursoFilter(curso);
    if (status) setStatusFilter(status);
    
    loadData();
  }, [searchParams, selectedUnidadeId]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      setCurrentPage(1);
      loadAlunos();
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, statusFilter, cursoFilter, currentPage, selectedUnidadeId]);

  async function loadData() {
    await Promise.all([loadAlunos(), loadCursos(), loadUnidades()]);
  }

  async function loadAlunos() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(ITEMS_PER_PAGE));
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (cursoFilter) params.set('curso', cursoFilter);
      if (searchTerm) params.set('search', searchTerm);
      if (selectedUnidadeId) params.set('unidade_id', selectedUnidadeId);

      const result = await api.get(`/api/alunos?${params.toString()}`);
      setAlunos(result.data || []);
      setTotalCount(result.count || 0);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      toast.error('Erro ao carregar alunos');
    } finally {
      setLoading(false);
    }
  }

  async function loadCursos() {
    try {
      const data = await api.get('/api/cursos');
      setCursos(data);
    } catch (error) {
      toast.error('Erro ao carregar cursos');
    }
  }

  async function loadUnidades() {
    try {
      const data = await api.get('/api/unidades');
      setUnidades(data);
    } catch { /* ignore */ }
  }

  function handleStatusFilter(status: 'all' | InterestStatus | 'none') {
    setStatusFilter(status);
    setCursoFilter(''); // Reset course filter when changing status
    setCurrentPage(1); // Reset to first page
  }

  function handleCursoFilter(cursoId: string) {
    setCursoFilter(cursoId);
    setCurrentPage(1); // Reset to first page
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/api/alunos/${editingId}`, formData);
        toast.success('Aluno atualizado com sucesso!');
      } else {
        await api.post('/api/alunos', formData);
        toast.success('Aluno adicionado com sucesso!');
      }

      setIsModalOpen(false);
      setFormData({ nome: '', email: '', whatsapp: '', empresa: '', available_periods: [], unidade_id: '' });
      setEditingId(null);
      loadAlunos();
    } catch (error) {
      toast.error('Erro ao salvar aluno');
    }
  }

  async function handleDelete(id: string) {
    const aluno = alunos.find(a => a.id === id);
    if (!aluno) return;

    setConfirmModal({
      isOpen: true,
      alunoId: id,
      alunoNome: aluno.nome
    });
  }

  async function handleConfirmDelete() {
    try {
      await api.delete(`/api/alunos/${confirmModal.alunoId}`);
      toast.success('Aluno excluído com sucesso!');
      loadAlunos();
    } catch (error) {
      toast.error('Erro ao excluir aluno');
    } finally {
      setConfirmModal({ isOpen: false, alunoId: '', alunoNome: '' });
    }
  }

  function handleCancelDelete() {
    setConfirmModal({ isOpen: false, alunoId: '', alunoNome: '' });
  }

  function handleEdit(aluno: Aluno) {
    setFormData({
      nome: aluno.nome,
      email: aluno.email || '',
      whatsapp: aluno.whatsapp,
      empresa: aluno.empresa || '',
      available_periods: aluno.available_periods || [],
      unidade_id: aluno.unidade_id || ''
    });
    setEditingId(aluno.id);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setFormData({ nome: '', email: '', whatsapp: '', empresa: '', available_periods: [], unidade_id: '' });
    setEditingId(null);
  }

  function handleOpenCursosInteresse(alunoId: string, alunoNome: string) {
    setCursosInteresseModal({
      isOpen: true,
      alunoId,
      alunoNome
    });
  }

  function handleCloseCursosInteresse() {
    setCursosInteresseModal({
      isOpen: false,
      alunoId: '',
      alunoNome: ''
    });
    loadAlunos(); // Reload to update interests
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
      case 'manha': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'tarde': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'noite': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  }

  function getStatusLabel(status: InterestStatus) {
    switch (status) {
      case 'interested': return 'Interessado';
      case 'enrolled': return 'Cursando';
      case 'completed': return 'Concluído';
      default: return status;
    }
  }

  function getStatusColor(status: InterestStatus) {
    switch (status) {
      case 'interested': return 'text-blue-400';
      case 'enrolled': return 'text-green-400';
      case 'completed': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  }

  // Bulk selection functions
  function toggleSelectionMode() {
    setIsSelectionMode(!isSelectionMode);
    setSelectedStudents(new Set());
  }

  function toggleStudentSelection(studentId: string) {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudents(newSelection);
  }

  function selectAllStudents() {
    const allIds = new Set(alunos.map(aluno => aluno.id));
    setSelectedStudents(allIds);
  }

  function clearSelection() {
    setSelectedStudents(new Set());
  }

  function handleBulkEditSuccess() {
    loadAlunos();
    setSelectedStudents(new Set());
    setIsSelectionMode(false);
  }

  // Calculate potential revenue from filtered students
  const faturamentoPotencial = React.useMemo(() => {
    if (statusFilter === 'interested') {
      // Se estamos filtrando por interessados, somar todos os valores dos cursos filtrados
      return alunos.reduce((total, aluno) => {
        if (aluno.curso_interests) {
          return total + aluno.curso_interests
            .filter(interest => interest.status === 'interested')
            .reduce((subtotal, interest) => subtotal + (interest.curso?.preco || 0), 0);
        }
        return total;
      }, 0);
    } else if (statusFilter === 'all') {
      // Se estamos vendo todos, somar apenas os interesses com status 'interested'
      return alunos.reduce((total, aluno) => {
        if (aluno.curso_interests) {
          return total + aluno.curso_interests
            .filter(interest => interest.status === 'interested')
            .reduce((subtotal, interest) => subtotal + (interest.curso?.preco || 0), 0);
        }
        return total;
      }, 0);
    } else {
      // Para outros filtros (enrolled, completed, none), não mostrar faturamento potencial
      return 0;
    }
  }, [alunos, statusFilter]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 fade-in-delay-1">
          <div className="slide-in-left">
            <h1 className="text-3xl font-bold text-white">Alunos</h1>
            <p className="text-gray-400 mt-2">Gerencie seus alunos e acompanhe o progresso nos cursos</p>
          </div>
          <div className="flex items-center gap-3 slide-in-right">
            {isSelectionMode && selectedStudents.size > 0 && (
              <button
                onClick={() => setBulkEditModal(true)}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors hover-glow"
              >
                <Edit3 className="h-5 w-5 mr-2" />
                Editar Selecionados ({selectedStudents.size})
              </button>
            )}
            <button
              onClick={toggleSelectionMode}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors hover-glow ${
                isSelectionMode 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isSelectionMode ? (
                <>
                  <Square className="h-5 w-5 mr-2" />
                  Cancelar Seleção
                </>
              ) : (
                <>
                  <CheckSquare className="h-5 w-5 mr-2" />
                  Selecionar Múltiplos
                </>
              )}
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

        {/* Bulk selection controls */}
        {isSelectionMode && (
          <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-purple-400 font-medium">
                  {selectedStudents.size} aluno{selectedStudents.size !== 1 ? 's' : ''} selecionado{selectedStudents.size !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllStudents}
                    className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors text-sm"
                  >
                    Selecionar Todos
                  </button>
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded hover:bg-gray-500/30 transition-colors text-sm"
                  >
                    Limpar Seleção
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 space-y-4 scale-in">
          <div className="flex items-center gap-4">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar alunos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Filtrar por curso
            </label>
            <select
              value={cursoFilter}
              onChange={(e) => handleCursoFilter(e.target.value)}
              disabled={statusFilter === 'none'}
              className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Todos os cursos</option>
              {cursos.map(curso => (
                <option key={curso.id} value={curso.id}>
                  {curso.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Filtrar por status de interesse
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleStatusFilter('all')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  statusFilter === 'all' 
                    ? 'bg-teal-accent text-dark' 
                    : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark-card'
                }`}
              >
                <Filter className="h-4 w-4" />
                Todos
              </button>
              <button
                onClick={() => handleStatusFilter('interested')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  statusFilter === 'interested' 
                    ? 'bg-teal-accent text-dark' 
                    : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark-card'
                }`}
              >
                <Users className="h-4 w-4" />
                Interessados
              </button>
              <button
                onClick={() => handleStatusFilter('enrolled')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  statusFilter === 'enrolled' 
                    ? 'bg-teal-accent text-dark' 
                    : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark-card'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Cursando
              </button>
              <button
                onClick={() => handleStatusFilter('completed')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  statusFilter === 'completed' 
                    ? 'bg-teal-accent text-dark' 
                    : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark-card'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Concluídos
              </button>
              <button
                onClick={() => handleStatusFilter('none')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  statusFilter === 'none' 
                    ? 'bg-teal-accent text-dark' 
                    : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark-card'
                }`}
              >
                <Users className="h-4 w-4" />
                Sem Interesse
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6 flex items-center justify-between bg-dark-card rounded-lg p-4 scale-in-delay-1">
          <div className="flex items-center gap-2 text-teal-accent">
            <Users className="h-5 w-5" />
            <span className="font-semibold">
              {totalCount} aluno{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
            </span>
          </div>
          {faturamentoPotencial > 0 && (
            <div className="text-emerald-400 font-semibold">
              Faturamento Potencial em Aberto: {formatCurrency(faturamentoPotencial)}
            </div>
          )}
          {totalPages > 1 && (
            <div className="text-gray-400 text-sm">
              Página {currentPage} de {totalPages}
            </div>
          )}
        </div>

        {/* Students Table */}
        <div className="bg-dark-card rounded-2xl overflow-hidden scale-in-delay-2">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-accent border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-400">Carregando alunos...</p>
            </div>
          ) : alunos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-lighter">
                  <tr>
                    {isSelectionMode && (
                      <th className="px-6 py-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedStudents.size === alunos.length && alunos.length > 0}
                          onChange={selectedStudents.size === alunos.length ? clearSelection : selectAllStudents}
                          className="w-4 h-4 text-purple-600 bg-dark border-gray-600 rounded focus:ring-purple-500"
                        />
                      </th>
                    )}
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                      Aluno
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                      Contato
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                      Horários
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                      Interesses
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {alunos.map((aluno) => (
                    <tr key={aluno.id} className="hover:bg-dark-lighter/50 transition-colors">
                      {isSelectionMode && (
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedStudents.has(aluno.id)}
                            onChange={() => toggleStudentSelection(aluno.id)}
                            className="w-4 h-4 text-purple-600 bg-dark border-gray-600 rounded focus:ring-purple-500"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-white font-medium">{aluno.nome}</div>
                          {aluno.empresa && (
                            <div className="text-gray-400 text-sm">{aluno.empresa}</div>
                          )}
                          {aluno.unidade_nome && (
                            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-teal-accent/10 text-teal-accent border border-teal-accent/20">
                              📍 {aluno.unidade_nome}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {aluno.email && (
                            <div className="text-gray-300 text-sm">{aluno.email}</div>
                          )}
                          <a 
                            href={`https://wa.me/${aluno.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 text-sm hover:text-green-300 transition-colors cursor-pointer flex items-center gap-1"
                            title="Abrir WhatsApp"
                          >
                            📱 {formatPhone(aluno.whatsapp)}
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {aluno.available_periods && aluno.available_periods.length > 0 ? (
                            (aluno.available_periods || []).map(period => (
                              <span
                                key={period}
                                className={`inline-flex items-center px-2 py-1 rounded text-xs border ${getPeriodColor(period)}`}
                              >
                                {getPeriodLabel(period)}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 text-sm">Flexível</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {aluno.curso_interests && aluno.curso_interests.length > 0 ? (
                            aluno.curso_interests.slice(0, 2).map(interest => (
                              <div key={interest.id} className="flex items-center gap-2">
                                <span className="text-white text-sm">
                                  {interest.curso?.nome}
                                </span>
                                <span className={`text-xs ${getStatusColor(interest.status)}`}>
                                  {getStatusLabel(interest.status)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-500 text-sm">Nenhum interesse</span>
                          )}
                          {aluno.curso_interests && aluno.curso_interests.length > 2 && (
                            <div className="text-gray-400 text-xs">
                              +{aluno.curso_interests.length - 2} mais
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleOpenCursosInteresse(aluno.id, aluno.nome)}
                            className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors text-sm"
                          >
                            Gerenciar Cursos
                          </button>
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
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum aluno encontrado</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount} alunos
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-dark-lighter text-gray-400 rounded-lg hover:text-white hover:bg-dark-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'bg-teal-accent text-dark'
                          : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark-card'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-dark-lighter text-gray-400 rounded-lg hover:text-white hover:bg-dark-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
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
          unidades={unidades}
        />

        <ModalCursosInteresse
          isOpen={cursosInteresseModal.isOpen}
          onClose={handleCloseCursosInteresse}
          alunoId={cursosInteresseModal.alunoId}
          alunoNome={cursosInteresseModal.alunoNome}
        />

        <ModalBulkEdit
          isOpen={bulkEditModal}
          onClose={() => setBulkEditModal(false)}
          selectedStudentIds={Array.from(selectedStudents)}
          cursos={cursos}
          onSuccess={handleBulkEditSuccess}
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
      </div>
    </div>
  );
}