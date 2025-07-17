import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2, X, BookOpen, Clock, Check, ArrowUpDown, Filter, TrendingUp, Sun, Sunset, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';
import { ConfirmationModal } from '../components/ConfirmationModal';

type SortField = 'created_at' | 'nome';
type SortDirection = 'asc' | 'desc';
type Period = 'manha' | 'tarde' | 'noite';

const PERIODS: { value: Period; label: string; icon: typeof Sun }[] = [
  { value: 'manha', label: 'Manhã', icon: Sun },
  { value: 'tarde', label: 'Tarde', icon: Sunset },
  { value: 'noite', label: 'Noite', icon: Moon }
];

interface CursoInterest {
  id?: string;
  curso_id: string;
  status: 'interested' | 'enrolled' | 'completed';
}

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

interface Curso {
  id: string;
  nome: string;
}

export function Alunos() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [totalOpenRevenue, setTotalOpenRevenue] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterInterestStatus, setFilterInterestStatus] = useState<CursoInterest['status'] | 'all'>('all');
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

  function calculateOpenRevenue(alunosData: Aluno[], cursosData: Curso[]): number {
    let total = 0;
    
    alunosData.forEach(aluno => {
      aluno.curso_interests?.forEach(interest => {
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

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [alunosResult, cursosResult] = await Promise.all([
        supabase
          .from('alunos')
          .select(`
            *,
            curso_interests:aluno_curso_interests(
              id,
              curso_id,
              status
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('cursos')
          .select('*')
          .order('nome')
      ]);

      if (alunosResult.error) throw alunosResult.error;
      if (cursosResult.error) throw cursosResult.error;

      const alunosData = alunosResult.data.map(aluno => ({
        ...aluno,
        curso_interests: aluno.curso_interests || []
      }));

      setAlunos(sortAlunos(alunosData, sortField, sortDirection));
      setCursos(cursosResult.data);
      setTotalOpenRevenue(calculateOpenRevenue(alunosData, cursosResult.data));
    } catch (error) {
      toast.error('Erro ao carregar dados');
    }
  }

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

  function handleSort(field: SortField) {
    const newDirection = field === sortField && sortDirection === 'desc' ? 'asc' : 'desc';
    setSortField(field);
    setSortDirection(newDirection);
    setAlunos(sortAlunos(alunos, field, newDirection));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        const { error } = await supabase
          .from('alunos')
          .update(formData)
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success('Aluno atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('alunos')
          .insert([formData]);
        
        if (error) throw error;
        toast.success('Aluno adicionado com sucesso!');
      }

      setIsModalOpen(false);
      setFormData({
        nome: '',
        email: '',
        whatsapp: '',
        empresa: ''
      });
      setEditingId(null);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar aluno');
    }
  }

  async function handleStatusChange(alunoId: string, cursoId: string, status: CursoInterest['status']) {
    try {
      // Check if interest already exists
      const { data: existingInterest } = await supabase
        .from('aluno_curso_interests')
        .select('id')
        .eq('aluno_id', alunoId)
        .eq('curso_id', cursoId)
        .maybeSingle();

      if (existingInterest) {
        // Update existing interest
        const { error } = await supabase
          .from('aluno_curso_interests')
          .update({ status })
          .eq('aluno_id', alunoId)
          .eq('curso_id', cursoId);
        
        if (error) throw error;
      } else {
        // Create new interest
        const { error } = await supabase
          .from('aluno_curso_interests')
          .insert([{
            aluno_id: alunoId,
            curso_id: cursoId,
            status
          }]);
        
        if (error) throw error;
      }

      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  }

  async function handleRemoveInterest(alunoId: string, cursoId: string) {
    try {
      const { error } = await supabase
        .from('aluno_curso_interests')
        .delete()
        .eq('aluno_id', alunoId)
        .eq('curso_id', cursoId);
      
      if (error) throw error;
      loadData();
    } catch (error) {
      toast.error('Erro ao remover interesse');
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
      const { error } = await supabase
        .from('alunos')
        .delete()
        .eq('id', confirmModal.alunoId);
      
      if (error) throw error;
      toast.success('Aluno excluído com sucesso!');
      loadData();
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
      available_periods: aluno.available_periods || []
    });
    setEditingId(aluno.id);
    setIsModalOpen(true);
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

  function getPeriodIcon(period: Period) {
    const periodConfig = PERIODS.find(p => p.value === period);
    const Icon = periodConfig?.icon || Sun;
    return <Icon className="h-4 w-4" />;
  }

  function getPeriodLabel(period: Period) {
    return PERIODS.find(p => p.value === period)?.label || '';
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const filteredAlunos = alunos.filter(aluno => {
    // Filter by search term
    const matchesSearch = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aluno.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aluno.whatsapp.includes(searchTerm);
    
    // Filter by interest status
    let matchesInterestStatus = true;
    if (filterInterestStatus !== 'all') {
      if (selectedCourseId) {
        // Filter by specific course and status
        matchesInterestStatus = aluno.curso_interests?.some(interest => 
          interest.curso_id === selectedCourseId && interest.status === filterInterestStatus
        ) || false;
      } else {
        // Filter by status across all courses
        matchesInterestStatus = aluno.curso_interests?.some(interest => 
          interest.status === filterInterestStatus
        ) || false;
      }
    }
    
    return matchesSearch && matchesInterestStatus;
  });

  const filterOptions = [
    { value: 'all' as const, label: 'Todos', icon: Filter },
    { value: 'interested' as const, label: 'Interessados', icon: BookOpen },
    { value: 'enrolled' as const, label: 'Cursando', icon: Clock },
    { value: 'completed' as const, label: 'Concluídos', icon: Check }
  ];

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 fade-in-delay-1">
          <h1 className="text-3xl font-bold text-white">Alunos</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors hover-scale"
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Aluno
          </button>
        </div>

        <div className="mb-6 fade-in-delay-1">
          <div className="bg-dark-card rounded-2xl p-6 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Faturamento Potencial em Aberto</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalOpenRevenue)}</p>
                <p className="text-gray-400 text-sm mt-1">
                  Valor total dos cursos com alunos interessados
                </p>
              </div>
              <div className="bg-teal-accent p-3 rounded-xl">
                <TrendingUp className="h-6 w-6 text-dark" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-4 fade-in-delay-2">
          <div>
            <input
              type="text"
              placeholder="Buscar alunos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Filtrar por curso
            </label>
            <select
              value={selectedCourseId || ''}
              onChange={(e) => setSelectedCourseId(e.target.value || null)}
              className="w-full max-w-md bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
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
              {filterOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setFilterInterestStatus(option.value)}
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

        <div className="bg-dark-card rounded-2xl overflow-hidden fade-in-delay-3">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
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
                  <th className="text-left p-4 text-gray-400 font-medium">Empresa</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Horários Disponíveis</th>
                  <th className="text-left p-4">
                    <button
                      onClick={() => handleSort('created_at')}
                      className="flex items-center text-gray-400 font-medium hover:text-white transition-colors"
                    >
                      Cadastrado em
                      <ArrowUpDown className={`ml-2 h-4 w-4 ${sortField === 'created_at' ? 'text-teal-accent' : ''}`} />
                    </button>
                  </th>
                  <th className="text-left p-4 text-gray-400 font-medium">Cursos</th>
                  <th className="text-right p-4 text-gray-400 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlunos.map((aluno) => (
                  <tr key={aluno.id} className="border-b border-gray-700/50">
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
                      <span className="text-gray-400">{aluno.empresa || '-'}</span>
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
                      <span className="text-gray-400">{formatDate(aluno.created_at)}</span>
                    </td>
                    <td className="p-4">
                      <div className="space-y-4">
                        {cursos.map(curso => {
                          const interest = aluno.curso_interests?.find(
                            ci => ci.curso_id === curso.id
                          );
                          
                          return (
                            <div key={curso.id} className="flex items-center gap-3 py-1">
                              <span className="text-white font-medium min-w-0 flex-1">{curso.nome}</span>
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(aluno.id, curso.id, 'interested')}
                                  className={`p-1.5 rounded-md transition-colors ${
                                    interest?.status === 'interested'
                                      ? 'bg-teal-accent/20 text-teal-accent'
                                      : 'bg-dark text-gray-400 hover:text-white'
                                  }`}
                                  title="Interessado"
                                >
                                  <BookOpen className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(aluno.id, curso.id, 'enrolled')}
                                  className={`p-1.5 rounded-md transition-colors ${
                                    interest?.status === 'enrolled'
                                      ? 'bg-yellow-500/20 text-yellow-500'
                                      : 'bg-dark text-gray-400 hover:text-white'
                                  }`}
                                  title="Cursando"
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(aluno.id, curso.id, 'completed')}
                                  className={`p-1.5 rounded-md transition-colors ${
                                    interest?.status === 'completed'
                                      ? 'bg-emerald-500/20 text-emerald-500'
                                      : 'bg-dark text-gray-400 hover:text-white'
                                  }`}
                                  title="Concluído"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                {interest && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveInterest(aluno.id, curso.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Remover"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
                {filteredAlunos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      Nenhum aluno encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-dark-card rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {editingId ? 'Editar Aluno' : 'Novo Aluno'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({
                      nome: '',
                      email: '',
                      whatsapp: '',
                      empresa: '',
                      available_periods: []
                    });
                    setEditingId(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-400 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  />
                </div>

                <div>
                  <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-400 mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="empresa" className="block text-sm font-medium text-gray-400 mb-1">
                    Empresa
                  </label>
                  <input
                    type="text"
                    id="empresa"
                    value={formData.empresa}
                    onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Horários Disponíveis
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PERIODS.map(period => (
                      <button
                        key={period.value}
                        type="button"
                        onClick={() => togglePeriod(period.value)}
                        className={`flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                          formData.available_periods.includes(period.value)
                            ? 'bg-teal-accent text-dark'
                            : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark-card'
                        }`}
                      >
                        <period.icon className="h-4 w-4" />
                        <span className="text-sm">{period.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Selecione os horários em que o aluno pode participar dos cursos
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-teal-accent text-dark font-medium rounded-lg px-4 py-2 hover:bg-teal-accent/90 transition-colors"
                >
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </button>
              </form>
            </div>
          </div>
        )}

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