import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Sun, Sunset, Moon, Users, BookOpen } from 'lucide-react';

/**
 * Tipos para o calendário de ocupação
 */
type Period = 'manha' | 'tarde' | 'noite';

interface Sala {
  id: string;
  nome: string;
  cadeiras: number;
}

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

interface CalendarOcupacaoSalasProps {
  salas: Sala[];
  turmas: Turma[];
}

/**
 * Configuração dos períodos com cores e ícones
 */
const PERIODS = [
  { 
    value: 'manha' as Period, 
    label: 'Manhã', 
    icon: Sun, 
    color: 'bg-gradient-to-r from-amber-500/80 to-orange-500/80',
    borderColor: 'border-amber-400/50',
    textColor: 'text-amber-100'
  },
  { 
    value: 'tarde' as Period, 
    label: 'Tarde', 
    icon: Sunset, 
    color: 'bg-gradient-to-r from-orange-500/80 to-red-500/80',
    borderColor: 'border-orange-400/50',
    textColor: 'text-orange-100'
  },
  { 
    value: 'noite' as Period, 
    label: 'Noite', 
    icon: Moon, 
    color: 'bg-gradient-to-r from-purple-500/80 to-indigo-500/80',
    borderColor: 'border-purple-400/50',
    textColor: 'text-purple-100'
  }
];

/**
 * Componente de calendário visual para ocupação de salas
 */
export function CalendarOcupacaoSalas({ salas, turmas }: CalendarOcupacaoSalasProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = getCurrentDateGMT3();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Segunda-feira como início
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  /**
   * Gera os dias da semana atual
   */
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(currentWeekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentWeekStart]);

  /**
   * Navega para a semana anterior
   */
  const goToPreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  /**
   * Navega para a próxima semana
   */
  const goToNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  /**
   * Volta para a semana atual
   */
  const goToCurrentWeek = () => {
    const today = getCurrentDateGMT3();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  /**
   * Verifica se uma turma está ativa em uma data específica
   */
  const isTurmaActiveOnDate = (turma: Turma, date: Date): boolean => {
    const startDate = new Date(turma.start_date);
    const endDate = new Date(turma.end_date);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return date >= startDate && date <= endDate;
  };

  /**
   * Obtém as turmas ativas para uma sala e data específicas
   */
  const getTurmasForSalaAndDate = (salaId: string, date: Date): Turma[] => {
    return turmas.filter(turma => 
      turma.sala_id === salaId && isTurmaActiveOnDate(turma, date)
    );
  };

  /**
   * Obtém a configuração de cor para um período
   */
  const getPeriodConfig = (period: Period) => {
    return PERIODS.find(p => p.value === period) || PERIODS[0];
  };

  /**
   * Formata a data para exibição
   */
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  /**
   * Formata o mês/ano para o cabeçalho
   */
  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  /**
   * Verifica se é hoje
   */
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  /**
   * Obtém o nome do dia da semana
   */
  const getDayName = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { weekday: 'short' });
  };

  return (
    <div className="bg-dark-card rounded-2xl p-6 scale-in-delay-3">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-teal-accent" />
          <div>
            <h2 className="text-xl font-semibold text-white">Ocupação das Salas</h2>
            <p className="text-gray-400 text-sm">
              {formatMonthYear(weekDays[0])} - {formatMonthYear(weekDays[6])}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-lighter rounded-lg transition-colors"
            title="Semana anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <button
            onClick={goToCurrentWeek}
            className="px-3 py-1 text-sm bg-teal-accent/20 text-teal-accent rounded-lg hover:bg-teal-accent/30 transition-colors"
          >
            Hoje
          </button>
          
          <button
            onClick={goToNextWeek}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-lighter rounded-lg transition-colors"
            title="Próxima semana"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Legenda */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <span className="text-gray-400 text-sm font-medium">Períodos:</span>
        {PERIODS.map(period => (
          <div key={period.value} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${period.color} ${period.borderColor} border`}></div>
            <period.icon className="h-4 w-4 text-gray-400" />
            <span className="text-gray-300 text-sm">{period.label}</span>
          </div>
        ))}
      </div>

      {/* Calendário */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Cabeçalho dos dias */}
          <div className="grid grid-cols-8 gap-2 mb-4">
            <div className="p-3 text-center">
              <span className="text-gray-400 font-medium text-sm">Salas</span>
            </div>
            {weekDays.map((day, index) => (
              <div 
                key={index} 
                className={`p-3 text-center rounded-lg border ${
                  isToday(day) 
                    ? 'bg-teal-accent/20 border-teal-accent/50 text-teal-accent' 
                    : 'bg-dark-lighter border-gray-700 text-gray-300'
                }`}
              >
                <div className="font-medium text-sm">
                  {getDayName(day)}
                </div>
                <div className="text-xs mt-1">
                  {formatDate(day)}
                </div>
              </div>
            ))}
          </div>

          {/* Linhas das salas */}
          <div className="space-y-3">
            {salas.map(sala => (
              <div key={sala.id} className="grid grid-cols-8 gap-2">
                {/* Nome da sala */}
                <div className="p-3 bg-dark-lighter rounded-lg border border-gray-700 flex items-center">
                  <div>
                    <div className="flex items-center gap-2 text-white font-medium text-sm">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      {sala.nome}
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                      <Users className="h-3 w-3" />
                      {sala.cadeiras} lugares
                    </div>
                  </div>
                </div>

                {/* Dias da semana para esta sala */}
                {weekDays.map((day, dayIndex) => {
                  const turmasNoDia = getTurmasForSalaAndDate(sala.id, day);
                  
                  return (
                    <div 
                      key={dayIndex} 
                      className="p-2 bg-dark-lighter rounded-lg border border-gray-700 min-h-[80px]"
                    >
                      <div className="space-y-1">
                        {PERIODS.map(period => {
                          const turmaNoPeriodo = turmasNoDia.find(t => t.period === period.value);
                          
                          if (turmaNoPeriodo) {
                            const alunosMatriculados = turmaNoPeriodo.alunos_enrolled?.length || 0;
                            const ocupacao = (alunosMatriculados / turmaNoPeriodo.cadeiras) * 100;
                            
                            return (
                              <div
                                key={period.value}
                                className={`
                                  ${period.color} ${period.borderColor} ${period.textColor}
                                  border rounded-md p-2 text-xs relative overflow-hidden
                                  hover:scale-105 transition-transform cursor-pointer
                                  shadow-lg
                                `}
                                title={`${turmaNoPeriodo.name} - ${turmaNoPeriodo.curso?.nome}\n${alunosMatriculados}/${turmaNoPeriodo.cadeiras} alunos (${ocupacao.toFixed(0)}%)`}
                              >
                                {/* Barra de ocupação */}
                                <div 
                                  className="absolute bottom-0 left-0 h-1 bg-white/40 transition-all duration-300"
                                  style={{ width: `${ocupacao}%` }}
                                ></div>
                                
                                <div className="flex items-center gap-1 opacity-90">
                                  <BookOpen className="h-2.5 w-2.5" />
                                  <span className="truncate text-xs">
                                    {turmaNoPeriodo.curso?.nome}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1 mt-1 opacity-80">
                                  <Users className="h-2.5 w-2.5" />
                                  <span className="text-xs">
                                    {alunosMatriculados}/{turmaNoPeriodo.cadeiras}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div
                              key={period.value}
                              className="h-6 bg-gray-800/30 border border-gray-700/50 rounded-md flex items-center justify-center opacity-50"
                            >
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Mensagem quando não há salas */}
          {salas.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma sala cadastrada</p>
              <p className="text-sm mt-1">Cadastre salas para visualizar a ocupação</p>
            </div>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-dark-lighter rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 font-medium text-sm">Total de Salas</span>
            </div>
            <span className="text-white text-xl font-bold">{salas.length}</span>
          </div>
          
          <div className="bg-dark-lighter rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-green-400" />
              <span className="text-green-400 font-medium text-sm">Turmas Ativas</span>
            </div>
            <span className="text-white text-xl font-bold">
              {turmas.filter(t => {
                const today = new Date();
                return isTurmaActiveOnDate(t, today);
              }).length}
            </span>
          </div>
          
          <div className="bg-dark-lighter rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-purple-400" />
              <span className="text-purple-400 font-medium text-sm">Taxa de Ocupação</span>
            </div>
            <span className="text-white text-xl font-bold">
              {(() => {
                const totalSlots = salas.length * 7 * 3; // salas × dias × períodos
                const occupiedSlots = weekDays.reduce((total, day) => {
                  return total + salas.reduce((salaTotal, sala) => {
                    const turmasNoDia = getTurmasForSalaAndDate(sala.id, day);
                    return salaTotal + turmasNoDia.length;
                  }, 0);
                }, 0);
                
                const occupationRate = totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0;
                return `${occupationRate.toFixed(0)}%`;
              })()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}