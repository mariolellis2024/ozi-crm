import React from 'react';
import { Calendar } from 'lucide-react';

interface DaySelectorProps {
  selectedDays: number[];
  onToggleDay: (dayValue: number) => void;
  cargaHorariaCurso: number;
  horasPorAula: number;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Segunda-feira', short: 'Seg' },
  { value: 2, label: 'Terça-feira', short: 'Ter' },
  { value: 3, label: 'Quarta-feira', short: 'Qua' },
  { value: 4, label: 'Quinta-feira', short: 'Qui' },
  { value: 5, label: 'Sexta-feira', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 7, label: 'Domingo', short: 'Dom' }
];

export { DAYS_OF_WEEK };

export function DaySelector({ selectedDays, onToggleDay, cargaHorariaCurso, horasPorAula }: DaySelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-teal-accent" />
        <h3 className="text-lg font-medium text-white">Dias da Semana</h3>
        <span className="text-sm text-gray-400">({horasPorAula} horas por aula)</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {DAYS_OF_WEEK.map(day => (
          <button
            key={day.value}
            type="button"
            onClick={() => onToggleDay(day.value)}
            className={`p-3 rounded-lg border transition-colors text-sm ${
              selectedDays.includes(day.value)
                ? 'bg-teal-accent text-dark border-teal-accent'
                : 'bg-dark-lighter text-gray-400 border-gray-700 hover:text-white hover:border-gray-600'
            }`}
          >
            <div className="font-medium">{day.short}</div>
            <div className="text-xs opacity-80">{day.label.split('-')[0]}</div>
          </button>
        ))}
      </div>
      
      <div className="text-sm text-gray-400">
        {selectedDays.length === 0 ? (
          <span className="text-red-400">⚠️ Selecione pelo menos um dia da semana</span>
        ) : (
          <div className="space-y-1">
            <span>
              Selecionados: {selectedDays.map(dayValue => 
                DAYS_OF_WEEK.find(d => d.value === dayValue)?.short
              ).join(', ')}
            </span>
            {cargaHorariaCurso > 0 && (
              <div className="text-xs">
                <span className="text-teal-accent">
                  {Math.ceil(cargaHorariaCurso / horasPorAula)} aulas necessárias
                </span>
                {selectedDays.length > 0 && (
                  <span className="ml-2">
                    • {selectedDays.length} dia{selectedDays.length > 1 ? 's' : ''} por semana
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
