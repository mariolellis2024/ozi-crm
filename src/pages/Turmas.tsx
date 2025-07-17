import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2, X, BookOpen, Clock, Check, Search, Users, Sun, Sunset, Moon, Calendar, Play, CheckCircle, AlertTriangle, Lightbulb, CalendarPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';
import { ConfirmationModal } from '../components/ConfirmationModal';

type Period = 'manha' | 'tarde' | 'noite';

interface ProfessorHours {
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
  created_at: string;
  professor_hours?: ProfessorHours[];
}

interface Curso {
  id: string;
  nome: string;
  preco: number;
  carga_horaria: number;
}

interface Professor {
  id: string;
  nome: string;
  valor_hora: number;
}

interface Sala {
  id: string;
  nome: string;
  cadeiras: number;
}

interface Aluno {
  id: string;
  nome: string;
  curso_interests?: Array<{
    curso_id: string;
    status: 'interested' | 'enrolled' | 'completed';
  }>;
}

const PERIODS: { value: Period; label: string; icon: typeof Sun }[] = [
  { value: 'manha', label: 'Manhã', icon: Sun },
  { value: 'tarde', label: 'Tarde', icon: Sunset },
  { value: 'noite', label: 'Noite', icon: Moon }
];

interface EmptySlot {
  date: Date;
  period: Period;
  formattedDate: string;
}

interface CourseSuggestion {
  curso: Curso;
  interestedCount: number;
}

export function Turmas() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [courseSuggestions, setCourseSuggestions] = useState<CourseSuggestion[]>([]);
  const [showCourseSuggestions, setShowCourseSuggestions] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'not_started' | 'in_progress' | 'completed'>('all');
  const [filterPeriod, setFilterPeriod] = useState<Period | 'all'>('all');
  const [formData, setFormData] = useState({
    curso_id: '',
    professor_hours: [] as ProfessorHours[],
    cadeiras: '',
    period: 'manha' as Period,
    sala_id: '',
    start_date: '',
    end_date: '',
    imposto: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    turmaId: '',
    turmaNome: ''
  });

  function calculateCourseSuggestions(alunosData: Aluno[], cursosData: Curso[]) {
    const courseInterestCount: { [cursoId: string]: number } = {};
    
    // Count interested students for each course
    alunosData.forEach(aluno => {
      aluno.curso_interests?.forEach(interest => {
        if (interest.status === 'interested') {
          courseInterestCount[interest.curso_id] = (courseInterestCount[interest.curso_id] || 0) + 1;
        }
      });
    });
    
    // Create suggestions array with course details
    const suggestions: CourseSuggestion[] = Object.entries(courseInterestCount)
      .map(([cursoId, count]) => {
        const curso = cursosData.find(c => c.id === cursoId);
        return curso ? { curso, interestedCount: count } : null;
      })
      .filter((suggestion): suggestion is CourseSuggestion => suggestion !== null)
      .sort((a, b) => b.interestedCount - a.interestedCount);
    
    setCourseSuggestions(suggestions);
  }

  function getTurmaStatus(turma: Turma): 'not_started' | 'in_progress' | 'completed' {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    const startDate = new Date(turma.start_date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(turma.end_date);
    endDate.setHours(0, 0, 0, 0);
    
    if (today < startDate) {
      return 'not_started';
    } else if (today > endDate) {
      return 'completed';
    } else {
      return 'in_progress';
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [turmasResult, cursosResult, professoresResult, salasResult, alunosResult] = await Promise.all([
        supabase
          .from('turmas')
          .select(`
            *,
            professor_hours:turma_professores(
              professor_id,
              hours
            )
          `)
          .order('created_at', { ascending: false }),
        supabase.from('cursos').select('*').order('nome'),
        supabase.from('professores').select('*').order('nome'),
        supabase.from('salas').select('*').order('nome'),
        supabase
          .from('alunos')
          .select(`
            *,
            curso_interests:aluno_curso_interests(
              curso_id,
              status
            )
          `)
      ]);

      if (turmasResult.error) throw turmasResult.error;
      if (cursosResult.error) throw cursosResult.error;
      if (professoresResult.error) throw professoresResult.error;
      if (salasResult.error) throw salasResult.error;
      if (alunosResult.error) throw alunosResult.error;

      setTurmas(turmasResult.data);
      setCursos(cursosResult.data);
      setProfessores(professoresResult.data);
      setSalas(salasResult.data);
      setAlunos(alunosResult.data);
      
      // Calculate course suggestions after data is loaded
      calculateCourseSuggestions(alunosResult.data, cursosResult.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    }
  }

  function calculateGastoProfessores(professorHours: ProfessorHours[]): number {
    return professorHours.reduce((total, ph) => {
      const professor = professores.find(p => p.id === ph.professor_id);
      return total + (professor?.valor_hora || 0) * ph.hours;
    }, 0);
  }

  function calculateLucro(faturamento: number, gastos: number, imposto: number): number {
    const impostoValue = (faturamento * imposto) / 100;
    return faturamento - gastos - impostoValue;
  }

  async function checkSalaAvailability(salaId: string, period: Period, startDate: Date, endDate: Date, excludeTurmaId?: string): Promise<boolean> {
    let query = supabase
      .from('turmas')
      .select('id, start_date, end_date')
      .eq('sala_id', salaId)
      .eq('period', period);

    if (excludeTurmaId) {
      query = query.neq('id', excludeTurmaId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const conflictingTurmas = data.filter(turma => 
      new Date(turma.start_date) <= endDate &&
      new Date(turma.end_date) >= startDate
    );

    return conflictingTurmas.length === 0;
  }

  const filteredTurmas = searchTerm
    ? turmas.filter(turma => {
        const baseName = turma.name.replace(/\s+\d+$/, '');
        const matchesSearch = baseName.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesStatus = true;
        if (filterStatus !== 'all') {
          matchesStatus = getTurmaStatus(turma) === filterStatus;
        }
        
        let matchesPeriod = true;
        if (filterPeriod !== 'all') {
          matchesPeriod = turma.period === filterPeriod;
        }
        
        return matchesSearch && matchesStatus && matchesPeriod;
      })
    : turmas.filter(turma => {
        let matchesStatus = true;
        if (filterStatus !== 'all') {
          matchesStatus = getTurmaStatus(turma) === filterStatus;
        }
        
        let matchesPeriod = true;
        if (filterPeriod !== 'all') {
          matchesPeriod = turma.period === filterPeriod;
        }
        
        return matchesStatus && matchesPeriod;
      });

  function getPeriodIcon(period: Period) {
    const periodConfig = PERIODS.find(p => p.value === period);
    const Icon = periodConfig?.icon || Sun;
    return <Icon className="h-4 w-4" />;
  }

  function getPeriodLabel(period: Period) {
    return PERIODS.find(p => p.value === period)?.label || '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const curso = cursos.find(c => c.id === formData.curso_id);
      const sala = salas.find(s => s.id === formData.sala_id);
      
      if (!curso || !sala) {
        toast.error('Curso ou sala não encontrados');
        return;
      }

      const totalHours = formData.professor_hours.reduce((sum, ph) => sum + ph.hours, 0);
      if (totalHours !== curso.carga_horaria) {
        toast.error(`A soma das horas dos professores deve ser igual à carga horária do curso (${curso.carga_horaria}h)`);
        return;
      }

      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);

      if (endDate <= startDate) {
        toast.error('A data de término deve ser posterior à data de início');
        return;
      }

      if (Number(formData.cadeiras) > sala.cadeiras) {
        toast.error(`A sala ${sala.nome} só comporta ${sala.cadeiras} alunos`);
        return;
      }

      const isAvailable = await checkSalaAvailability(
        formData.sala_id,
        formData.period as Period,
        startDate,
        endDate,
        editingId || undefined
      );

      if (!isAvailable) {
        toast.error('Esta sala já está ocupada neste período e datas');
        return;
      }

      let turmaName: string;
      if (editingId) {
        const currentTurma = turmas.find(t => t.id === editingId);
        const currentNumber = currentTurma?.name.split(' ').pop();
        turmaName = `${curso.nome} ${currentNumber}`;
      } else {
        const existingTurmas = turmas.filter(t => t.curso_id === formData.curso_id);
        const nextNumber = existingTurmas.length + 1;
        turmaName = `${curso.nome} ${nextNumber}`;
      }

      const turmaData = {
        name: turmaName,
        curso_id: formData.curso_id,
        sala_id: formData.sala_id,
        cadeiras: Number(formData.cadeiras),
        potencial_faturamento: Number(formData.cadeiras) * curso.preco,
        period: formData.period,
        start_date: formData.start_date,
        end_date: formData.end_date,
        imposto: Number(formData.imposto)
      };

      if (editingId) {
        // Update turma
        const { error: turmaError } = await supabase
          .from('turmas')
          .update(turmaData)
          .eq('id', editingId);
        
        if (turmaError) throw turmaError;

        // Delete existing professor hours
        const { error: deleteError } = await supabase
          .from('turma_professores')
          .delete()
          .eq('turma_id', editingId);
        
        if (deleteError) throw deleteError;

        // Insert new professor hours
        if (formData.professor_hours.length > 0) {
          const professorHoursData = formData.professor_hours.map(ph => ({
            turma_id: editingId,
            professor_id: ph.professor_id,
            hours: ph.hours
          }));

          const { error: insertError } = await supabase
            .from('turma_professores')
            .insert(professorHoursData);
          
          if (insertError) throw insertError;
        }

        toast.success('Turma atualizada com sucesso!');
      } else {
        // Insert new turma
        const { data: newTurma, error: turmaError } = await supabase
          .from('turmas')
          .insert([turmaData])
          .select()
          .single();
        
        if (turmaError) throw turmaError;

        // Insert professor hours
        if (formData.professor_hours.length > 0) {
          const professorHoursData = formData.professor_hours.map(ph => ({
            turma_id: newTurma.id,
            professor_id: ph.professor_id,
            hours: ph.hours
          }));

          const { error: insertError } = await supabase
            .from('turma_professores')
            .insert(professorHoursData);
          
          if (insertError) throw insertError;
        }

        toast.success('Turma criada com sucesso!');
      }

      setIsModalOpen(false);
      setFormData({
        curso_id: '',
        professor_hours: [],
        cadeiras: '',
        period: 'manha',
        sala_id: '',
        start_date: '',
        end_date: '',
        imposto: ''
      });
      setEditingId(null);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar turma');
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
    } catch (error) {
      toast.error('Erro ao excluir turma');
    } finally {
      setConfirmModal({ isOpen: false, turmaId: '', turmaNome: '' });
    }
  }

  function handleCancelDelete() {
    setConfirmModal({ isOpen: false, turmaId: '', turmaNome: '' });
  }

  async function handleStatusChange(alunoId: string, cursoId: string, status: 'interested' | 'enrolled' | 'completed') {
    try {
      const { error } = await supabase
        .from('aluno_curso_interests')
        .upsert({
          aluno_id: alunoId,
          curso_id: cursoId,
          status: status
        }, {
          onConflict: 'aluno_id,curso_id'
        });
      
      if (error) throw error;
      
      toast.success('Status do aluno atualizado com sucesso!');
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar status do aluno');
    }
  }

  function handleEdit(turma: Turma) {
    setFormData({
      curso_id: turma.curso_id,
      professor_hours: turma.professor_hours || [],
      cadeiras: turma.cadeiras.toString(),
      period: turma.period,
      sala_id: turma.sala_id,
      start_date: turma.start_date,
      end_date: turma.end_date,
      imposto: turma.imposto.toString()
    });
    setEditingId(turma.id);
    setIsModalOpen(true);
  }

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 fade-in-delay-1">
          <div>
            <h1 className="text-3xl font-bold text-white">Turmas</h1>
            <p className="text-gray-400 mt-2">Gerencie suas turmas e acompanhe o desempenho</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors hover-scale"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nova Turma
          </button>
        </div>

        <div className="mb-6 space-y-4 fade-in-delay-2">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar turmas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Filtrar por status
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-teal-accent text-dark'
                    : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark-card'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>Todas</span>
              </button>
              <button
                onClick={() => setFilterStatus('not_started')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  filterStatus === 'not_started'
                    ? 'bg-teal-accent text-dark'
                    : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark-card'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>Não Iniciadas</span>
              </button>
              <button
                onClick={() => setFilterStatus('in_progress')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  filterStatus === 'in_progress'
                    ? 'bg-teal-accent text-dark'
                    : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark-card'
                }`}
              >
                <Play className="h-4 w-4" />
                <span>Em Andamento</span>
              </button>
              <button
                onClick={() => setFilterStatus('completed')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  filterStatus === 'completed'
                    ? 'bg-teal-accent text-dark'
                    : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark-card'
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                <span>Concluídas</span>
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Filtrar por período
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterPeriod('all')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  filterPeriod === 'all'
                    ? 'bg-teal-accent text-dark'
                    : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark-card'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>Todos</span>
              </button>
              {PERIODS.map(period => (
                <button
                  key={period.value}
                  onClick={() => setFilterPeriod(period.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    filterPeriod === period.value
                      ? 'bg-teal-accent text-dark'
                      : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark-card'
                  }`}
                >
                  <period.icon className="h-4 w-4" />
                  <span>{period.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {courseSuggestions.length > 0 && showCourseSuggestions && (
          <div className="mb-6 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-2xl p-6 fade-in-delay-3 relative">
            <button
              onClick={() => setShowCourseSuggestions(false)}
              className="absolute top-4 right-4 text-orange-400 hover:text-orange-300 transition-colors"
              title="Fechar mensagem"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-start gap-3">
              <Lightbulb className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-500 mb-3">
                  Sugestões de Novas Turmas
                </h3>
                <p className="text-orange-200 mb-4">
                  Baseado no interesse dos alunos cadastrados, considere criar turmas para:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courseSuggestions.slice(0, 6).map((suggestion, index) => (
                    <div key={suggestion.curso.id} className={`rounded-lg p-4 ${
                      index === 0 
                        ? 'bg-gradient-to-br from-red-500/15 to-orange-500/15 border border-red-500/20' 
                        : index === 1 
                        ? 'bg-gradient-to-br from-orange-500/15 to-amber-500/15 border border-orange-500/20'
                        : index === 2
                        ? 'bg-gradient-to-br from-amber-500/15 to-yellow-500/15 border border-amber-500/20'
                        : 'bg-teal-500/10 border border-teal-500/20'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={`font-medium truncate ${
                          index === 0 
                            ? 'text-red-400' 
                            : index === 1 
                            ? 'text-orange-400'
                            : index === 2
                            ? 'text-amber-400'
                            : 'text-teal-400'
                        }`}>
                          {suggestion.curso.nome}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          index === 0 
                            ? 'bg-red-500/20 text-red-300' 
                            : index === 1 
                            ? 'bg-orange-500/20 text-orange-300'
                            : index === 2
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-teal-500/20 text-teal-300'
                        }`}>
                          #{index + 1}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`${
                            index <= 2 ? 'text-orange-200' : 'text-teal-200'
                          }`}>Alunos interessados:</span>
                          <span className={`font-semibold ${
                            index === 0 
                              ? 'text-red-400' 
                              : index === 1 
                              ? 'text-orange-400'
                              : index === 2
                              ? 'text-amber-400'
                              : 'text-teal-400'
                          }`}>
                            {suggestion.interestedCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className={`${
                            index <= 2 ? 'text-orange-200' : 'text-teal-200'
                          }`}>Faturamento potencial:</span>
                          <span className={`font-semibold ${
                            index === 0 
                              ? 'text-red-400' 
                              : index === 1 
                              ? 'text-orange-400'
                              : index === 2
                              ? 'text-amber-400'
                              : 'text-teal-400'
                          }`}>
                            {formatCurrency(suggestion.curso.preco * suggestion.interestedCount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className={`${
                            index <= 2 ? 'text-orange-200' : 'text-teal-200'
                          }`}>Carga horária:</span>
                          <span className={`${
                            index === 0 
                              ? 'text-red-400' 
                              : index === 1 
                              ? 'text-orange-400'
                              : index === 2
                              ? 'text-amber-400'
                              : 'text-teal-400'
                          }`}>
                            {suggestion.curso.carga_horaria}h
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {courseSuggestions.length > 6 && (
                  <div className="mt-4 text-center">
                    <span className="text-orange-300 text-sm">
                      +{courseSuggestions.length - 6} outros cursos com interesse
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 fade-in-delay-3">
          {filteredTurmas.map((turma) => {
            const curso = cursos.find(c => c.id === turma.curso_id);
            const sala = salas.find(s => s.id === turma.sala_id);
            const gastoProfessores = calculateGastoProfessores(turma.professor_hours || []);
            const impostoValue = (turma.potencial_faturamento * turma.imposto) / 100;
            const lucro = calculateLucro(turma.potencial_faturamento, gastoProfessores, turma.imposto);
            const interessados = alunos.filter(aluno => 
              aluno.curso_interests?.some(interest => interest.curso_id === turma.curso_id)
            );

            const alunosMatriculados = alunos.filter(aluno => 
              aluno.curso_interests?.some(interest => 
                interest.curso_id === turma.curso_id && interest.status === 'enrolled'
              )
            ).length;

            let ocupacao = 0;
            if (turma.cadeiras > 0) {
              ocupacao = (alunosMatriculados / turma.cadeiras) * 100;
            }

            let occupancyColorClass = 'text-gray-400'; // Default color
            if (turma.cadeiras > 0) {
              if (ocupacao === 100) occupancyColorClass = 'text-emerald-400'; // Full
              else if (ocupacao >= 70) occupancyColorClass = 'text-yellow-400'; // High occupancy
              else occupancyColorClass = 'text-red-400'; // Low occupancy
            }
            const status = getTurmaStatus(turma);
            const statusConfig = {
              not_started: { label: 'Não Iniciada', color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
              in_progress: { label: 'Em Andamento', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
              completed: { label: 'Concluída', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' }
            };

            return (
              <div key={turma.id} className="bg-dark-card rounded-2xl p-6 hover-lift">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-2 ${statusConfig[status].color} ${statusConfig[status].bgColor}`}>
                      {status === 'not_started' && <Clock className="h-3 w-3 mr-1" />}
                      {status === 'in_progress' && <Play className="h-3 w-3 mr-1" />}
                      {status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                      <span>{statusConfig[status].label}</span>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">{turma.name.replace(/\s+\d+$/, '')}</h3>
                      <div className="flex items-center gap-1 text-gray-400 text-sm">
                        {getPeriodIcon(turma.period)}
                        <span>{getPeriodLabel(turma.period)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className={`flex items-center ${occupancyColorClass}`}>
                        <Users className="h-4 w-4 mr-2" />
                        <span className="font-bold">Vagas:</span>
                        <span> {turma.cadeiras} </span>
                        <span className="font-medium">em {sala?.nome}</span>
                      </div>
                      <div className="text-gray-400">
                        <p><span className="font-medium">Início:</span> {new Date(turma.start_date).toLocaleDateString()}</p>
                        <p><span className="font-medium">Término:</span> {new Date(turma.end_date).toLocaleDateString()}</p>
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

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Professores</h4>
                    <div className="space-y-2">
                      {(turma.professor_hours || []).map(ph => {
                        const professor = professores.find(p => p.id === ph.professor_id);
                        return (
                          <div key={ph.professor_id} className="flex justify-between items-center">
                            <span className="text-gray-300 font-medium">{professor?.nome}</span>
                            <span>{ph.hours}h</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Alunos Interessados</h4>
                    <div className="space-y-2">
                      {interessados.map(aluno => (
                        <div key={aluno.id} className="flex justify-between items-center">
                          <span className="text-gray-300 font-medium">{aluno.nome}</span>
                          <button
                            onClick={() => {
                              const currentStatus = aluno.curso_interests?.find(ci => ci.curso_id === turma.curso_id)?.status;
                              const newStatus = currentStatus === 'interested' ? 'enrolled' : 'interested';
                              handleStatusChange(aluno.id, turma.curso_id, newStatus);
                            }}
                            className="p-1 rounded-lg transition-colors hover:bg-dark-lighter"
                            title={`Clique para alternar status`}
                          >
                            {(() => {
                              const status = aluno.curso_interests?.find(ci => ci.curso_id === turma.curso_id)?.status;
                              if (status === 'interested') {
                                return <BookOpen className="h-4 w-4 text-teal-accent" />;
                              } else if (status === 'enrolled') {
                                return <Clock className="h-4 w-4 text-yellow-500" />;
                              } else if (status === 'completed') {
                                return <Check className="h-4 w-4 text-emerald-500" />;
                              }
                              return <BookOpen className="h-4 w-4 text-gray-400" />;
                            })()}
                          </button>
                        </div>
                      ))}
                      {interessados.length === 0 && (
                        <div className="text-gray-400 text-sm">
                          Nenhum aluno interessado
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400 font-medium">Faturamento Atual</span>
                        <span className="text-emerald-400 font-medium">
                          {formatCurrency((() => {
                            const alunosMatriculados = alunos.filter(aluno => 
                              aluno.curso_interests?.some(interest => 
                                interest.curso_id === turma.curso_id && interest.status === 'enrolled'
                              )
                            ).length;
                            return alunosMatriculados * (curso?.preco || 0);
                          })())}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400 font-medium">Faturamento em Aberto</span>
                        <span className="text-yellow-400 font-medium">
                          {formatCurrency((() => {
                            const alunosMatriculados = alunos.filter(aluno => 
                              aluno.curso_interests?.some(interest => 
                                interest.curso_id === turma.curso_id && interest.status === 'enrolled'
                              )
                            ).length;
                            const vagasDisponiveis = turma.cadeiras - alunosMatriculados;
                            return Math.max(0, vagasDisponiveis) * (curso?.preco || 0);
                          })())}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400 font-medium">Potencial de Faturamento</span>
                        <span className="text-teal-accent font-medium">
                          {formatCurrency(turma.potencial_faturamento)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400 font-medium">Gasto com Professores</span>
                        <span className="text-orange-400 font-medium">
                          {formatCurrency(gastoProfessores)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400 font-medium">Imposto ({turma.imposto}%)</span>
                        <span className="text-orange-400 font-medium">
                          {formatCurrency(impostoValue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-700">
                        <span className="text-gray-400 font-medium">Lucro</span>
                        <span className="text-emerald-500 font-medium">
                          {formatCurrency(lucro)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredTurmas.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-8">
              {turmas.length === 0 ? 'Nenhuma turma cadastrada' : 'Nenhuma turma encontrada'}
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-dark-card rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {editingId ? 'Editar Turma' : 'Nova Turma'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({
                      curso_id: '',
                      professor_hours: [],
                      cadeiras: '',
                      period: 'manha',
                      sala_id: '',
                      start_date: '',
                      end_date: '',
                      imposto: ''
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
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Curso
                  </label>
                  <select
                    value={formData.curso_id}
                    onChange={(e) => setFormData({ ...formData, curso_id: e.target.value })}
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                    required
                  >
                    <option value="">Selecione um curso</option>
                    {cursos.map(curso => (
                      <option key={curso.id} value={curso.id}>
                        {curso.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Sala
                  </label>
                  <select
                    value={formData.sala_id}
                    onChange={(e) => setFormData({ ...formData, sala_id: e.target.value })}
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                    required
                  >
                    <option value="">Selecione uma sala</option>
                    {salas.map(sala => (
                      <option key={sala.id} value={sala.id}>
                        {sala.nome} ({sala.cadeiras} cadeiras)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Período
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PERIODS.map(period => (
                      <button
                        key={period.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, period: period.value })}
                        className={`flex items-center justify-center gap-2 p-2 rounded-lg transition-colors ${
                          formData.period === period.value
                            ? 'bg-teal-accent text-dark'
                            : 'bg-dark-lighter text-gray-400 hover:text-white'
                        }`}
                      >
                        <period.icon className="h-4 w-4" />
                        <span>{period.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Data de Início
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Data de Término
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Número de Cadeiras
                  </label>
                  <input
                    type="number"
                    value={formData.cadeiras}
                    onChange={(e) => setFormData({ ...formData, cadeiras: e.target.value })}
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Professores e Horas
                  </label>
                  <div className="space-y-2">
                    {professores.map(professor => (
                      <div key={professor.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`professor-${professor.id}`}
                          checked={formData.professor_hours.some(ph => ph.professor_id === professor.id)}
                          onChange={(e) => {
                            const newProfessorHours = e.target.checked
                              ? [...formData.professor_hours, { professor_id: professor.id, hours: 0 }]
                              : formData.professor_hours.filter(ph => ph.professor_id !== professor.id);
                            setFormData({ ...formData, professor_hours: newProfessorHours });
                          }}
                          className="rounded border-gray-700 bg-dark-lighter text-teal-accent focus:ring-teal-accent"
                        />
                        <label
                          htmlFor={`professor-${professor.id}`}
                          className="flex-1 text-white"
                        >
                          {professor.nome}
                        </label>
                        {formData.professor_hours.some(ph => ph.professor_id === professor.id) && (
                          <input
                            type="number"
                            value={formData.professor_hours.find(ph => ph.professor_id === professor.id)?.hours || 0}
                            onChange={(e) => {
                              const newProfessorHours = formData.professor_hours.map(ph =>
                                ph.professor_id === professor.id
                                  ? { ...ph, hours: Number(e.target.value) }
                                  : ph
                              );
                              setFormData({ ...formData, professor_hours: newProfessorHours });
                            }}
                            className="w-20 bg-dark-lighter border border-gray-700 rounded-lg px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                            min="0"
                            required
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Imposto (%)
                  </label>
                  <input
                    type="number"
                    value={formData.imposto}
                    onChange={(e) => setFormData({ ...formData, imposto: e.target.value })}
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-teal-accent text-dark font-medium rounded-lg px-4 py-2 hover:bg-teal-accent/90 transition-colors"
                >
                  {editingId ? 'Atualizar' : 'Criar Turma'}
                </button>
              </form>
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
}