import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { DaySelector, DAYS_OF_WEEK } from './turma/DaySelector';
import { ProfessorList } from './turma/ProfessorList';

type Period = 'manha' | 'tarde' | 'noite' | 'dia_inteiro';

interface ProfessorAssignment {
  professor_id: string;
  hours: number;
}

interface ModalTurmaProps {
  isOpen: boolean;
  editingId: string | null;
  formData: {
    name: string;
    curso_id: string;
    sala_id: string;
    cadeiras: string;
    period: Period;
    start_date: string;
    end_date: string;
    imposto: string;
    investimento_anuncios: string;
    investimento_anuncios_realizado: string;
    professores: ProfessorAssignment[];
    days_of_week: number[];
    horario_inicio: string;
    horario_fim: string;
    local_aula: string;
    endereco_aula: string;
    carga_horaria_total: string;
    acompanhamento_inicio: string;
    acompanhamento_fim: string;
    sessoes_online: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string;
    curso_id: string;
    sala_id: string;
    cadeiras: string;
    period: Period;
    start_date: string;
    end_date: string;
    imposto: string;
    investimento_anuncios: string;
    investimento_anuncios_realizado: string;
    professores: ProfessorAssignment[];
    days_of_week: number[];
    horario_inicio: string;
    horario_fim: string;
    local_aula: string;
    endereco_aula: string;
    carga_horaria_total: string;
    acompanhamento_inicio: string;
    acompanhamento_fim: string;
    sessoes_online: string;
  }>>;
  cursos: Array<{ id: string; nome: string; carga_horaria: number }>;
  salas: Array<{ id: string; nome: string; cadeiras: number; unidade_id?: string; unidade_nome?: string }>;
  professores: Array<{ id: string; nome: string; valor_hora: number; unidade_id?: string }>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const PERIODS: { value: Period; label: string; color: string }[] = [
  { value: 'manha', label: 'Manhã', color: 'text-yellow-400' },
  { value: 'tarde', label: 'Tarde', color: 'text-orange-400' },
  { value: 'noite', label: 'Noite', color: 'text-blue-400' },
  { value: 'dia_inteiro', label: 'Dia Inteiro', color: 'text-emerald-400' }
];

export function ModalTurma({ 
  isOpen, 
  editingId, 
  formData, 
  setFormData, 
  cursos,
  salas,
  professores,
  onSubmit, 
  onClose 
}: ModalTurmaProps) {
  const selectedCurso = cursos.find(c => c.id === formData.curso_id);
  const totalHorasProfessores = formData.professores.reduce((total, prof) => total + prof.hours, 0);
  const cargaHorariaCurso = selectedCurso?.carga_horaria || 0;
  const horasValidas = totalHorasProfessores === cargaHorariaCurso;

  // Validação da data de início
  const isStartDateValid = () => {
    if (!formData.start_date || !formData.days_of_week || formData.days_of_week.length === 0) {
      return true;
    }
    const startDate = new Date(formData.start_date + 'T00:00:00');
    const startDayOfWeek = startDate.getDay() === 0 ? 7 : startDate.getDay();
    return formData.days_of_week.includes(startDayOfWeek);
  };

  const startDateValid = isStartDateValid();

  // Função para calcular a data de término automaticamente
  function calculateEndDate(startDate: string, daysOfWeek: number[], totalHours: number): string {
    if (!startDate || !daysOfWeek.length || !totalHours) return '';
    
    const hoursPerClass = formData.period === 'dia_inteiro' ? 6 : 3;
    const totalClasses = Math.ceil(totalHours / hoursPerClass);
    
    const start = new Date(startDate + 'T00:00:00');
    let currentDate = new Date(start);
    let classesScheduled = 0;
    
    while (!daysOfWeek.includes(currentDate.getDay() === 0 ? 7 : currentDate.getDay())) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    while (classesScheduled < totalClasses) {
      const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
      if (daysOfWeek.includes(dayOfWeek)) {
        classesScheduled++;
        if (classesScheduled < totalClasses) {
          do {
            currentDate.setDate(currentDate.getDate() + 1);
          } while (!daysOfWeek.includes(currentDate.getDay() === 0 ? 7 : currentDate.getDay()));
        }
      } else {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    return currentDate.toISOString().split('T')[0];
  }

  // Atualizar data de término automaticamente
  React.useEffect(() => {
    if (formData.start_date && formData.days_of_week.length > 0 && cargaHorariaCurso > 0) {
      const calculatedEndDate = calculateEndDate(
        formData.start_date, 
        formData.days_of_week, 
        cargaHorariaCurso
      );
      if (calculatedEndDate && calculatedEndDate !== formData.end_date) {
        setFormData(prev => ({ ...prev, end_date: calculatedEndDate }));
      }
    }
  }, [formData.start_date, formData.days_of_week, cargaHorariaCurso, formData.period]);
  
  function toggleDayOfWeek(dayValue: number) {
    const currentDays = formData.days_of_week || [];
    const isSelected = currentDays.includes(dayValue);
    
    if (isSelected) {
      setFormData({ ...formData, days_of_week: currentDays.filter(day => day !== dayValue) });
    } else {
      setFormData({ ...formData, days_of_week: [...currentDays, dayValue].sort() });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!horasValidas && cargaHorariaCurso > 0) {
      toast.error(`O total de horas dos professores (${totalHorasProfessores}h) deve ser igual à carga horária do curso (${cargaHorariaCurso}h)`);
      return;
    }

    onSubmit(e);
  }

  return createPortal(
    isOpen ? (
      <div 
        className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div 
          className="bg-dark-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">
              {editingId ? 'Editar Turma' : 'Nova Turma'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">
                  Nome da Turma
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  required
                />
              </div>

              <div>
                <label htmlFor="curso_id" className="block text-sm font-medium text-gray-400 mb-1">
                  Curso
                </label>
                <select
                  id="curso_id"
                  value={formData.curso_id}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  required
                  onChange={(e) => {
                    const selectedCursoId = e.target.value;
                    const selectedCurso = cursos.find(c => c.id === selectedCursoId);
                    setFormData({ 
                      ...formData, 
                      curso_id: selectedCursoId,
                      name: selectedCurso ? selectedCurso.nome : ''
                    });
                  }}
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
                <label htmlFor="sala_id" className="block text-sm font-medium text-gray-400 mb-1">
                  Sala
                </label>
                <select
                  id="sala_id"
                  value={formData.sala_id}
                  onChange={(e) => setFormData({ ...formData, sala_id: e.target.value })}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  required
                >
                  <option value="">Selecione uma sala</option>
                  {(() => {
                    const grouped: Record<string, typeof salas> = {};
                    salas.forEach(s => {
                      const key = s.unidade_nome || 'Sem unidade';
                      if (!grouped[key]) grouped[key] = [];
                      grouped[key].push(s);
                    });
                    const keys = Object.keys(grouped);
                    if (keys.length <= 1 && keys[0] === 'Sem unidade') {
                      return salas.map(sala => (
                        <option key={sala.id} value={sala.id}>
                          {sala.nome} ({sala.cadeiras} cadeiras)
                        </option>
                      ));
                    }
                    return keys.map(key => (
                      <optgroup key={key} label={key}>
                        {grouped[key].map(sala => (
                          <option key={sala.id} value={sala.id}>
                            {sala.nome} ({sala.cadeiras} cadeiras)
                          </option>
                        ))}
                      </optgroup>
                    ));
                  })()}
                </select>
              </div>

              <div>
                <label htmlFor="cadeiras" className="block text-sm font-medium text-gray-400 mb-1">
                  Número de Vagas
                </label>
                <input
                  type="number"
                  id="cadeiras"
                  value={formData.cadeiras}
                  onChange={(e) => setFormData({ ...formData, cadeiras: e.target.value })}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  min="1"
                  required
                />
              </div>

              <div>
                <label htmlFor="period" className="block text-sm font-medium text-gray-400 mb-1">
                  Período
                </label>
                <select
                  id="period"
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value as Period })}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  required
                >
                  {PERIODS.map(period => (
                    <option key={period.value} value={period.value} className={period.color}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="imposto" className="block text-sm font-medium text-gray-400 mb-1">
                  Imposto (%)
                </label>
                <input
                  type="number"
                  id="imposto"
                  value={formData.imposto}
                  onChange={(e) => setFormData({ ...formData, imposto: e.target.value })}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label htmlFor="investimento_anuncios" className="block text-sm font-medium text-gray-400 mb-1">
                  Investimento Ads Previsto (R$)
                </label>
                <input
                  type="number"
                  id="investimento_anuncios"
                  value={formData.investimento_anuncios}
                  onChange={(e) => setFormData({ ...formData, investimento_anuncios: e.target.value })}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  min="0"
                  step="100"
                  placeholder="0"
                />
              </div>

              <div>
                <label htmlFor="investimento_anuncios_realizado" className="block text-sm font-medium text-gray-400 mb-1">
                  Investimento Ads Realizado (R$)
                </label>
                <input
                  type="number"
                  id="investimento_anuncios_realizado"
                  value={formData.investimento_anuncios_realizado}
                  onChange={(e) => setFormData({ ...formData, investimento_anuncios_realizado: e.target.value })}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  min="0"
                  step="100"
                  placeholder="0"
                />
              </div>

              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-400 mb-1">
                  Data de Início
                </label>
                <input
                  type="date"
                  id="start_date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className={`w-full bg-dark-lighter border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 ${
                    !startDateValid && formData.start_date && formData.days_of_week.length > 0
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-700 focus:ring-teal-accent'
                  }`}
                  required
                />
                {!startDateValid && formData.start_date && formData.days_of_week.length > 0 && (
                  <p className="text-red-400 text-xs mt-1">
                    A data de início deve ser em um dos dias selecionados: {
                      formData.days_of_week.map(dayValue => 
                        DAYS_OF_WEEK.find(d => d.value === dayValue)?.short
                      ).join(', ')
                    }
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-gray-400 mb-1">
                  Data de Término (Calculada Automaticamente)
                </label>
                <input
                  type="date"
                  id="end_date"
                  value={formData.end_date}
                  readOnly
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  required
                />
                {formData.start_date && formData.days_of_week.length > 0 && cargaHorariaCurso > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Baseado em {Math.ceil(cargaHorariaCurso / (formData.period === 'dia_inteiro' ? 6 : 3))} {formData.period === 'dia_inteiro' ? 'dias de 6h (manhã + tarde)' : 'aulas de 3h'} nos dias selecionados
                  </p>
                )}
              </div>
            </div>

            {/* Sub-componente: Dias da Semana */}
            <DaySelector
              selectedDays={formData.days_of_week || []}
              onToggleDay={toggleDayOfWeek}
              cargaHorariaCurso={cargaHorariaCurso}
            />

            {/* Sub-componente: Professores */}
            <ProfessorList
              professores={formData.professores}
              availableProfessores={professores}
              salas={salas}
              selectedSalaId={formData.sala_id}
              cargaHorariaCurso={cargaHorariaCurso}
              onAdd={() => setFormData({
                ...formData,
                professores: [...formData.professores, { professor_id: '', hours: 0 }]
              })}
              onRemove={(index) => setFormData({
                ...formData,
                professores: formData.professores.filter((_, i) => i !== index)
              })}
              onUpdate={(index, field, value) => {
                const newProfessores = [...formData.professores];
                newProfessores[index] = {
                  ...newProfessores[index],
                  [field]: field === 'hours' ? Number(value) : value
                };
                setFormData({ ...formData, professores: newProfessores });
              }}
            />

            {/* Contract-specific fields (collapsible) */}
            <details className="border border-gray-700 rounded-lg">
              <summary className="px-4 py-3 text-sm font-medium text-purple-400 cursor-pointer hover:bg-dark-lighter transition-colors rounded-lg">
                📄 Dados para o Contrato (opcional)
              </summary>
              <div className="p-4 pt-2 space-y-4 border-t border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Horário Início</label>
                    <input type="time" value={formData.horario_inicio} onChange={(e) => setFormData({ ...formData, horario_inicio: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Horário Fim</label>
                    <input type="time" value={formData.horario_fim} onChange={(e) => setFormData({ ...formData, horario_fim: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Local das Aulas</label>
                    <input type="text" value={formData.local_aula} onChange={(e) => setFormData({ ...formData, local_aula: e.target.value })} placeholder="Ex: Sala 3 - Prédio A" className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Carga Horária Total</label>
                    <input type="number" value={formData.carga_horaria_total} onChange={(e) => setFormData({ ...formData, carga_horaria_total: e.target.value })} placeholder="horas" className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Endereço Completo das Aulas</label>
                  <input type="text" value={formData.endereco_aula} onChange={(e) => setFormData({ ...formData, endereco_aula: e.target.value })} placeholder="Endereço onde ocorrem as aulas" className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Início Acompanhamento Online</label>
                    <input type="date" value={formData.acompanhamento_inicio} onChange={(e) => setFormData({ ...formData, acompanhamento_inicio: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Término Acompanhamento Online</label>
                    <input type="date" value={formData.acompanhamento_fim} onChange={(e) => setFormData({ ...formData, acompanhamento_fim: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Dia e Horário das Sessões Online</label>
                  <input type="text" value={formData.sessoes_online} onChange={(e) => setFormData({ ...formData, sessoes_online: e.target.value })} placeholder="Ex: Terças 20h" className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              </div>
            </details>
            
            
            <button
              type="submit"
              className={`w-full font-medium rounded-lg px-4 py-2 transition-colors ${
                (horasValidas || cargaHorariaCurso === 0) && 
                (formData.days_of_week || []).length > 0 && 
                startDateValid
                  ? 'bg-teal-accent text-dark hover:bg-teal-accent/90'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              disabled={
                (!horasValidas && cargaHorariaCurso > 0) || 
                (formData.days_of_week || []).length === 0 || 
                !startDateValid
              }
            >
              {editingId ? 'Atualizar' : 'Criar Turma'}
            </button>
          </form>
        </div>
      </div>
    ) : null,
    document.body
  );
}