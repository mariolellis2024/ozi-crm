import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CalendarOcupacaoSalas } from '../components/CalendarOcupacaoSalas';
import { Calendar, TrendingUp, Users, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';

/**
 * Tipos para a página de ocupação
 */
type Period = 'manha' | 'tarde' | 'noite';

interface Turma {
  id: string;
  name: string;
  curso_id: string;
  sala_id: string;
  period: Period;
  start_date: string;
  end_date: string;
  cadeiras: number;
  curso?: {
    nome: string;
    preco: number;
  };
  alunos_enrolled?: Array<{ id: string; nome: string }>;
}

interface Sala {
  id: string;
  nome: string;
  cadeiras: number;
}

/**
 * Página de Ocupação das Salas
 * 
 * Funcionalidades:
 * - Visualização em calendário da ocupação das salas
 * - Estatísticas de ocupação e faturamento
 * - Análise de utilização dos espaços
 */
export function Ocupacao() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Carrega dados das turmas e salas
   */
  async function loadData() {
    try {
      setLoading(true);
      
      const [turmasResult, salasResult, interessesResult] = await Promise.all([
        supabase
          .from('turmas')
          .select(`
            *,
            curso:cursos(nome, preco),
            sala:salas(nome, cadeiras)
          `)
          .order('start_date', { ascending: true }),
        supabase
          .from('salas')
          .select('*')
          .order('nome'),
        supabase
          .from('aluno_curso_interests')
          .select(`
            turma_id,
            status,
            aluno:alunos(id, nome)
          `)
          .eq('status', 'enrolled')
      ]);

      if (turmasResult.error) throw turmasResult.error;
      if (salasResult.error) throw salasResult.error;
      if (interessesResult.error) throw interessesResult.error;

      // Adicionar alunos matriculados às turmas
      const turmasData = turmasResult.data.map(turma => ({
        ...turma,
        alunos_enrolled: interessesResult.data
          .filter((interest: any) => interest.turma_id === turma.id)
          .map((interest: any) => ({
            id: interest.aluno.id,
            nome: interest.aluno.nome
          }))
      }));

      setTurmas(turmasData);
      setSalas(salasResult.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados de ocupação');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Calcula estatísticas de ocupação
   */
  const stats = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Turmas ativas hoje
    const turmasAtivas = turmas.filter(turma => {
      const startDate = new Date(turma.start_date);
      const endDate = new Date(turma.end_date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      return today >= startDate && today <= endDate;
    });

    // Total de vagas ocupadas vs disponíveis
    const totalVagasDisponiveis = salas.reduce((total, sala) => total + sala.cadeiras, 0);
    const totalAlunosMatriculados = turmasAtivas.reduce((total, turma) => 
      total + (turma.alunos_enrolled?.length || 0), 0
    );

    // Faturamento das turmas ativas
    const faturamentoAtivo = turmasAtivas.reduce((total, turma) => 
      total + ((turma.alunos_enrolled?.length || 0) * (turma.curso?.preco || 0)), 0
    );

    // Taxa de ocupação das salas (considerando períodos)
    const totalSlotsPossiveis = salas.length * 3; // 3 períodos por sala
    const slotsOcupados = turmasAtivas.length;
    const taxaOcupacaoSalas = totalSlotsPossiveis > 0 ? (slotsOcupados / totalSlotsPossiveis) * 100 : 0;

    return {
      totalSalas: salas.length,
      turmasAtivas: turmasAtivas.length,
      totalVagasDisponiveis,
      totalAlunosMatriculados,
      faturamentoAtivo,
      taxaOcupacaoSalas,
      taxaOcupacaoAlunos: totalVagasDisponiveis > 0 ? (totalAlunosMatriculados / totalVagasDisponiveis) * 100 : 0
    };
  }, [turmas, salas]);

  if (loading) {
    return (
      <div className="p-8 fade-in">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-accent border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8 fade-in-delay-1">
          <div className="slide-in-left">
            <h1 className="text-3xl font-bold text-white">Ocupação das Salas</h1>
            <p className="text-gray-400 mt-2">
              Visualize a ocupação das salas em tempo real e analise a utilização dos espaços
            </p>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 scale-in-delay-1">
          <div className="bg-dark-card rounded-2xl p-6 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total de Salas</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalSalas}</p>
              </div>
              <div className="bg-blue-500 p-3 rounded-xl">
                <MapPin className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-dark-card rounded-2xl p-6 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Turmas Ativas</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.turmasAtivas}</p>
              </div>
              <div className="bg-green-500 p-3 rounded-xl">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-dark-card rounded-2xl p-6 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Taxa de Ocupação</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {stats.taxaOcupacaoSalas.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalAlunosMatriculados}/{stats.totalVagasDisponiveis} alunos
                </p>
              </div>
              <div className="bg-purple-500 p-3 rounded-xl">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-dark-card rounded-2xl p-6 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Faturamento Ativo</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {formatCurrency(stats.faturamentoAtivo)}
                </p>
              </div>
              <div className="bg-teal-accent p-3 rounded-xl">
                <TrendingUp className="h-6 w-6 text-dark" />
              </div>
            </div>
          </div>
        </div>

        {/* Calendário de Ocupação */}
        <CalendarOcupacaoSalas 
          salas={salas}
          turmas={turmas}
        />

        {/* Análise Detalhada */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 scale-in-delay-3">
          {/* Ocupação por Sala */}
          <div className="bg-dark-card rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-400" />
              Ocupação por Sala
            </h3>
            <div className="space-y-4">
              {salas.map(sala => {
                const turmasDaSala = turmas.filter(t => {
                  const today = new Date();
                  const startDate = new Date(t.start_date);
                  const endDate = new Date(t.end_date);
                  today.setHours(0, 0, 0, 0);
                  startDate.setHours(0, 0, 0, 0);
                  endDate.setHours(23, 59, 59, 999);
                  
                  return t.sala_id === sala.id && today >= startDate && today <= endDate;
                });
                
                const alunosNaSala = turmasDaSala.reduce((total, turma) => 
                  total + (turma.alunos_enrolled?.length || 0), 0
                );
                
                const ocupacaoPercentual = sala.cadeiras > 0 ? (alunosNaSala / sala.cadeiras) * 100 : 0;
                
                return (
                  <div key={sala.id} className="bg-dark-lighter rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium">{sala.nome}</span>
                      <span className="text-gray-400 text-sm">
                        {alunosNaSala}/{sala.cadeiras} alunos
                      </span>
                    </div>
                    <div className="w-full bg-dark rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-teal-accent to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(ocupacaoPercentual, 100)}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      {turmasDaSala.length} turma{turmasDaSala.length !== 1 ? 's' : ''} ativa{turmasDaSala.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })}
              {salas.length === 0 && (
                <div className="text-center text-gray-400 py-4">
                  Nenhuma sala cadastrada
                </div>
              )}
            </div>
          </div>

          {/* Distribuição por Período */}
          <div className="bg-dark-card rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-400" />
              Distribuição por Período
            </h3>
            <div className="space-y-4">
              {(['manha', 'tarde', 'noite'] as Period[]).map(period => {
                const turmasNoPeriodo = turmas.filter(t => {
                  const today = new Date();
                  const startDate = new Date(t.start_date);
                  const endDate = new Date(t.end_date);
                  today.setHours(0, 0, 0, 0);
                  startDate.setHours(0, 0, 0, 0);
                  endDate.setHours(23, 59, 59, 999);
                  
                  return t.period === period && today >= startDate && today <= endDate;
                });
                
                const alunosNoPeriodo = turmasNoPeriodo.reduce((total, turma) => 
                  total + (turma.alunos_enrolled?.length || 0), 0
                );
                
                const periodLabels = {
                  manha: 'Manhã',
                  tarde: 'Tarde', 
                  noite: 'Noite'
                };
                
                const periodColors = {
                  manha: 'from-amber-500 to-orange-500',
                  tarde: 'from-orange-500 to-red-500',
                  noite: 'from-purple-500 to-indigo-500'
                };
                
                return (
                  <div key={period} className="bg-dark-lighter rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium">{periodLabels[period]}</span>
                      <span className="text-gray-400 text-sm">
                        {turmasNoPeriodo.length} turmas • {alunosNoPeriodo} alunos
                      </span>
                    </div>
                    <div className="w-full bg-dark rounded-full h-2">
                      <div
                        className={`bg-gradient-to-r ${periodColors[period]} h-2 rounded-full transition-all duration-300`}
                        style={{ 
                          width: `${salas.length > 0 ? (turmasNoPeriodo.length / salas.length) * 100 : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}