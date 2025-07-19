import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2, Calendar, Users, MapPin, Clock, Lightbulb, ChevronDown, ChevronUp, Sun, Sunset, Moon, Search, Filter, BookOpen, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ModalTurma } from '../components/ModalTurma';

type Period = 'manha' | 'tarde' | 'noite';
type TurmaStatus = 'aberta' | 'andamento' | 'finalizada' | 'all';

const PERIODS: { value: Period; label: string; icon: typeof Sun }[] = [
  { value: 'manha', label: 'Manhã', icon: Sun },
  { value: 'tarde', label: 'Tarde', icon: Sunset },
  { value: 'noite', label: 'Noite', icon: Moon }
];

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

interface Suggestion {
  curso: Curso;
  interestedCount: number;
  potentialRevenue: number;
  recommendedPeriods: Period[];
}

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
    imposto: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);

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
            aluno:alunos(id, nome)
          `)
      ]);

      if (turmasResult.error) throw turmasResult.error;
      if (cursosResult.error) throw cursosResult.error;
      if (salasResult.error) throw salasResult.error;
      if (professoresResult.error) throw professoresResult.error;
      if (interessesResult.error) throw interessesResult.error;

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
            !interest.turma_id
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

        if (!suggestionMap[curso.id]) {
          suggestionMap[curso.id] = {
            curso,
            interestedCount: 0,
            potentialRevenue: 0,
            recommendedPeriods: []
          };
        }

        suggestionMap[curso.id].interestedCount++;
        suggestionMap[curso.id].potentialRevenue += curso.preco;

        // Count period preferences
        const periods = interest.aluno?.available_periods || [];
        periods.forEach((period: Period) => {
          if (!suggestionMap[curso.id].recommendedPeriods.includes(period)) {
            suggestionMap[curso.id].recommendedPeriods.push(period);
          }
        });
      });

      // Filter suggestions with at least 2 interested students and sort by potential revenue
      const filteredSuggestions = Object.values(suggestionMap)
        .filter(s => s.interestedCount >= 2)
        .sort((a, b) => b.potentialRevenue - a.potentialRevenue);

      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const curso = cursos.find(c => c.id === formData.curso_id);
      if (!curso) throw new Error('Curso não encontrado');

      const turmaData = {
        ...formData,
        cadeiras: Number(formData.cadeiras),
        potencial_faturamento: curso.preco * Number(formData.cadeiras),
        imposto: Number(formData.imposto)
      };

      if (editingId) {
        const { error } = await supabase
          .from('turmas')
          .update(turmaData)
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success('Turma atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('turmas')
          .insert([turmaData]);
        
        if (error) throw error;
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

  function handleEdit(turma: Turma) {
    setFormData({
      name: turma.name,
      curso_id: turma.curso_id,
      sala_id: turma.sala_id,
      cadeiras: turma.cadeiras.toString(),
      period: turma.period,
      start_date: turma.start_date,
      end_date: turma.end_date,
      imposto: turma.imposto.toString()
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
      imposto: ''
    });
    setEditingId(null);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  async function handleEnrollStudent(alunoId: string, turmaId: string, cursoId: string) {
    try {
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
              onClick={() => setShowSuggestions(!showSuggestions)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
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
              className="flex items-center px-4 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors hover-glow"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nova Turma
            </button>
          </div>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="mb-6 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-2xl p-6 fade-in-delay-3 relative scale-in">
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
              {suggestions.slice(0, 6).map((suggestion, index) => (
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
                    {suggestion.recommendedPeriods.length > 0 && (
                      <div>
                        <span className="text-gray-400 text-xs">Horários recomendados:</span>
                        <div className="flex gap-1 mt-1">
                          {suggestion.recommendedPeriods.map(period => (
                            <div
                              key={period}
                              className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs"
                            >
                              {getPeriodIcon(period)}
                              <span>{getPeriodLabel(period).slice(0, 1)}</span>
                            </div>
                          ))}
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
                      <span>{turma.cadeiras} vagas</span>
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
                      <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 w-full col-span-full">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-blue-400" />
                          <span className="text-blue-400 font-medium text-sm">
                            {turma.alunos_interessados.length} Interessado{turma.alunos_interessados.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {turma.alunos_interessados.slice(0, 3).map((aluno) => (
                            <div key={aluno.id} className="flex items-center justify-between gap-2 text-blue-300 text-xs">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-3 w-3 text-blue-400" />
                                <span>{aluno.nome}</span>
                              </div>
                              <button
                                onClick={() => handleEnrollStudent(aluno.id, turma.id, turma.curso_id)}
                                className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition-colors"
                                title="Matricular na turma"
                              >
                                Matricular
                              </button>
                            </div>
                          ))}
                          {turma.alunos_interessados.length > 3 && (
                            <div className="flex items-center justify-between">
                              <div className="text-blue-400 text-xs font-medium">
                                +{turma.alunos_interessados.length - 3} mais
                              </div>
                              <button
                                onClick={() => setExpandedTurma(expandedTurma === turma.id ? null : turma.id)}
                                className="text-blue-400 text-xs hover:text-blue-300 transition-colors"
                              >
                                {expandedTurma === turma.id ? 'Ver menos' : 'Ver todos'}
                              </button>
                            </div>
                          )}
                        </div>
                        {expandedTurma === turma.id && turma.alunos_interessados.length > 3 && (
                          <div className="space-y-2 mt-2 pt-2 border-t border-blue-500/20">
                            {turma.alunos_interessados.slice(3).map((aluno) => (
                              <div key={aluno.id} className="flex items-center justify-between gap-2 text-blue-300 text-xs">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-3 w-3 text-blue-400" />
                                  <span>{aluno.nome}</span>
                                </div>
                                <button
                                  onClick={() => handleEnrollStudent(aluno.id, turma.id, turma.curso_id)}
                                  className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition-colors"
                                  title="Matricular na turma"
                                >
                                  Matricular
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 text-emerald-400 text-xs font-medium">
                          Potencial: {formatCurrency((turma.curso?.preco || 0) * turma.alunos_interessados.length)}
                        </div>
                      </div>
                    )}
                    
                    {/* Alunos Matriculados (Cursando) */}
                    {turma.alunos_enrolled && turma.alunos_enrolled.length > 0 && (
                      <div className="mt-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
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
      </div>
    </div>
  );
}