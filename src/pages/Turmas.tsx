import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2, Users, Calendar, Clock, TrendingUp, BookOpen, UserCheck, AlertCircle, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ModalTurma } from '../components/ModalTurma';
import { ModalAlunosInteressados } from '../components/ModalAlunosInteressados';
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
}

export function Turmas() {
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
    cursoPreco: 0
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
  }, []);

  async function loadData() {
    try {
      const [turmasResult, cursosResult, salasResult, professoresResult] = await Promise.all([
        supabase
          .from('turmas')
          .select(`
            *,
            curso:cursos(*),
            sala:salas(*),
            professores:turma_professores(
              id,
              professor_id,
              hours,
              professor:professores(id, nome, valor_hora)
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('cursos')
          .select('*')
          .order('nome'),
        supabase
          .from('salas')
          .select('*')
          .order('nome'),
        supabase
          .from('professores')
          .select('*')
          .order('nome')
      ]);

      if (turmasResult.error) throw turmasResult.error;
      if (cursosResult.error) throw cursosResult.error;
      if (salasResult.error) throw salasResult.error;
      if (professoresResult.error) throw professoresResult.error;

      // Get enrolled students count for each turma
      const turmasWithEnrolledCount = await Promise.all(
        turmasResult.data.map(async (turma) => {
          const { data: enrolledStudents } = await supabase
            .from('aluno_curso_interests')
            .select(`
              aluno:alunos(id, nome)
            `)
            .eq('turma_id', turma.id)
            .eq('status', 'enrolled');

          return {
            ...turma,
            alunos_enrolled: enrolledStudents?.map(item => item.aluno) || []
          };
        })
      );

      setTurmas(turmasWithEnrolledCount);
      setCursos(cursosResult.data);
      setSalas(salasResult.data);
      setProfessores(professoresResult.data);

      // Generate suggestions
      await generateSuggestions();
    } catch (error) {
      console.error('Erro detalhado ao carregar dados:', error);
      toast.error(`Erro ao carregar dados: ${error.message || 'Erro desconhecido'}`);
    }
  }

  async function generateSuggestions() {
    try {
      const { data: interessesAlunos, error } = await supabase
        .from('aluno_curso_interests')
        .select(`
          curso_id,
          status,
          aluno:alunos(available_periods)
        `)
        .eq('status', 'interested');

      if (error) throw error;

      // Group by course and period
      const sugestoes = interessesAlunos.reduce((acc: any, interesse) => {
        const cursoId = interesse.curso_id;
        const periodos = interesse.aluno?.available_periods || ['manha', 'tarde', 'noite'];
        
        if (!acc[cursoId]) {
          acc[cursoId] = { manha: 0, tarde: 0, noite: 0 };
        }
        
        periodos.forEach((periodo: Period) => {
          acc[cursoId][periodo]++;
        });
        
        return acc;
      }, {});

      // Filter courses with sufficient demand (>= 5 interested students)
      const cursosComDemanda = Object.entries(sugestoes)
        .filter(([cursoId, demanda]: [string, any]) => 
          Math.max(...Object.values(demanda)) >= 5
        )
        .map(([cursoId, demanda]: [string, any]) => {
          const curso = cursos.find(c => c.id === cursoId);
          const melhorPeriodo = Object.entries(demanda)
            .reduce((a: [string, number], b: [string, number]) => a[1] > b[1] ? a : b)[0] as Period;
          
          return {
            cursoId,
            cursoNome: curso?.nome || 'Curso não encontrado',
            melhorPeriodo,
            totalInteressados: Math.max(...Object.values(demanda))
          };
        });

      setSuggestions(cursosComDemanda);
    } catch (error) {
      console.error('Erro detalhado ao gerar sugestões:', error);
    }
  }

  async function checkConflicts(turmaData: any, editingId?: string): Promise<boolean> {
    try {
      const { data: conflitos, error } = await supabase
        .from('turmas')
        .select('id, name, start_date, end_date')
        .eq('sala_id', turmaData.sala_id)
        .eq('period', turmaData.period)
        .neq('id', editingId || '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      // Check for date overlaps
      const hasConflict = conflitos.some(turma => {
        const existingStart = new Date(turma.start_date);
        const existingEnd = new Date(turma.end_date);
        const newStart = new Date(turmaData.start_date);
        const newEnd = new Date(turmaData.end_date);
        
        return (newStart <= existingEnd && newEnd >= existingStart);
      });

      return hasConflict;
    } catch (error) {
      console.error('Erro detalhado ao verificar conflitos:', error);
      throw error;
    }
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
        days_of_week: formData.days_of_week
      };

      // Check for conflicts
      const hasConflict = await checkConflicts(turmaData, editingId || undefined);
      if (hasConflict) {
        toast.error('Conflito detectado! Já existe uma turma nesta sala, período e com datas sobrepostas.');
        return;
      }

      let turmaId: string;

      if (editingId) {
        const { error } = await supabase
          .from('turmas')
          .update(turmaData)
          .eq('id', editingId);
        
        if (error) throw error;
        turmaId = editingId;
        toast.success('Turma atualizada com sucesso!');
      } else {
        const { data, error } = await supabase
          .from('turmas')
          .insert([turmaData])
          .select()
          .single();
        
        if (error) throw error;
        turmaId = data.id;
        toast.success('Turma criada com sucesso!');
      }

      // Handle professor assignments
      if (formData.professores.length > 0) {
        // Remove existing assignments if editing
        if (editingId) {
          await supabase
            .from('turma_professores')
            .delete()
            .eq('turma_id', editingId);
        }

        // Add new assignments - filter out empty professor_ids
        const assignments = formData.professores
          .filter(prof => prof.professor_id && prof.professor_id.trim() !== '')
          .map(prof => ({
          turma_id: turmaId,
          professor_id: prof.professor_id,
          hours: prof.hours
        }));

        if (assignments.length > 0) {
          const { error: assignmentError } = await supabase
            .from('turma_professores')
            .insert(assignments);

          if (assignmentError) throw assignmentError;
        }
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
        professores: [],
        days_of_week: []
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
      const { error } = await supabase
        .from('turmas')
        .delete()
        .eq('id', confirmModal.turmaId);
      
      if (error) throw error;
      toast.success('Turma excluída com sucesso!');
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
      professores: turma.professores?.map(tp => ({
        professor_id: tp.professor_id,
        hours: tp.hours
      })) || [],
      days_of_week: turma.days_of_week || []
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
      professores: [],
      days_of_week: []
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
      cursoPreco: turma.curso.preco
    });
  }

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

  function handleStudentEnrolled() {
    loadData(); // Reload data to update enrolled count
  }

  function getPeriodIcon(period: Period) {
    switch (period) {
      case 'manha': return '🌅';
      case 'tarde': return '☀️';
      case 'noite': return '🌙';
      default: return '⏰';
    }
  }

  function getPeriodLabel(period: Period) {
    switch (period) {
      case 'manha': return 'Manhã';
      case 'tarde': return 'Tarde';
      case 'noite': return 'Noite';
      default: return period;
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  const totalFaturamentoPotencial = turmas.reduce((total, turma) => total + turma.potencial_faturamento, 0);
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
              <div className="bg-green-500 p-3 rounded-xl">
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
                          {getPeriodIcon(sugestao.melhorPeriodo)} {getPeriodLabel(sugestao.melhorPeriodo)}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {sugestao.totalInteressados} alunos interessados
                      </p>
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
                        <span>{turma.sala?.nome}</span>
                      </div>
                      <div className="flex items-center text-gray-400">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{getPeriodIcon(turma.period)} {getPeriodLabel(turma.period)}</span>
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

                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Faturamento Potencial</span>
                    <span className="text-teal-accent font-semibold">
                      {formatCurrency(turma.potencial_faturamento)}
                    </span>
                  </div>
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
          onStudentEnrolled={handleStudentEnrolled}
        />
      </div>
    </div>
  );
}