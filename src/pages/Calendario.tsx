import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Turma {
  id: string;
  name: string;
  curso_id: string;
  curso?: { nome: string };
  sala?: { nome: string };
  period: string;
  start_date: string;
  end_date: string;
  cadeiras: number;
  days_of_week: string[];
  alunos_enrolled?: any[];
}

const PERIOD_COLORS: Record<string, string> = {
  manha: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  tarde: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  noite: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
};

const PERIOD_LABELS: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function Calendario() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredTurma, setHoveredTurma] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  useEffect(() => {
    loadTurmas();
  }, []);

  async function loadTurmas() {
    try {
      const data = await api.get('/api/turmas');
      setTurmas(data);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function getTurmasForDay(day: number): Turma[] {
    const date = new Date(year, month, day);
    const jsDow = date.getDay(); // 0=Sunday ... 6=Saturday
    // Convert JS day-of-week to ISO day-of-week (1=Monday ... 7=Sunday)
    const isoDow = jsDow === 0 ? 7 : jsDow;

    return turmas.filter(turma => {
      const start = new Date(turma.start_date + 'T00:00:00');
      const end = new Date(turma.end_date + 'T23:59:59');
      if (date < start || date > end) return false;

      const daysArr = Array.isArray(turma.days_of_week) ? turma.days_of_week : [];
      if (daysArr.length === 0) return true;
      // days_of_week contains ISO numbers (1=Mon..7=Sun), may be strings from backend
      return daysArr.some(d => Number(d) === isoDow);
    });
  }

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Calendário</h1>
            <p className="text-gray-400 mt-2">Visualização mensal das turmas</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="p-2 rounded-lg bg-dark-card text-gray-400 hover:text-white transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-white font-semibold text-lg capitalize min-w-[200px] text-center">
              {monthName}
            </span>
            <button onClick={nextMonth} className="p-2 rounded-lg bg-dark-card text-gray-400 hover:text-white transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-4">
          {Object.entries(PERIOD_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${PERIOD_COLORS[key].split(' ')[0]}`} />
              <span className="text-gray-400 text-xs">{label}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="bg-dark-card rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-7 border-b border-dark-lighter">
            {DAY_LABELS.map(day => (
              <div key={day} className="text-center py-3 text-gray-400 text-sm font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-dark-lighter/30 bg-dark-lighter/10" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayTurmas = getTurmasForDay(day);
              const isToday = new Date().getFullYear() === year && new Date().getMonth() === month && new Date().getDate() === day;

              return (
                <div key={day} className={`min-h-[100px] border-b border-r border-dark-lighter/30 p-1 ${isToday ? 'bg-teal-accent/5' : ''}`}>
                  <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    isToday ? 'bg-teal-accent text-dark' : 'text-gray-400'
                  }`}>
                    {day}
                  </span>
                  <div className="space-y-0.5 mt-0.5">
                    {dayTurmas.slice(0, 3).map(turma => (
                      <div
                        key={turma.id}
                        className={`relative text-[10px] px-1.5 py-0.5 rounded border cursor-pointer truncate ${PERIOD_COLORS[turma.period] || 'bg-gray-500/20 text-gray-400 border-gray-500/40'} ${
                          hoveredTurma === turma.id ? 'ring-1 ring-white/30' : ''
                        }`}
                        onMouseEnter={() => setHoveredTurma(turma.id)}
                        onMouseLeave={() => setHoveredTurma(null)}
                      >
                        {turma.name || turma.curso?.nome || 'Turma'}
                        {hoveredTurma === turma.id && (
                          <div className="absolute z-20 left-0 top-full mt-1 bg-dark-card border border-dark-lighter rounded-lg shadow-xl p-3 min-w-[180px]">
                            <p className="text-white font-medium text-xs">{turma.name || turma.curso?.nome}</p>
                            <p className="text-gray-400 text-[10px]">{turma.curso?.nome}</p>
                            <div className="mt-1 space-y-0.5">
                              <p className="text-gray-500 text-[10px]">📍 {turma.sala?.nome || '—'}</p>
                              <p className="text-gray-500 text-[10px]">🕐 {PERIOD_LABELS[turma.period]}</p>
                              <p className="text-gray-500 text-[10px]">👥 {turma.alunos_enrolled?.length || 0}/{turma.cadeiras}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {dayTurmas.length > 3 && (
                      <span className="text-[9px] text-gray-500 pl-1">+{dayTurmas.length - 3} mais</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
