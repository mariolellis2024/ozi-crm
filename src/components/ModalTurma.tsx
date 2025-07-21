import React from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, GraduationCap, Calendar } from 'lucide-react';

type Period = 'manha' | 'tarde' | 'noite';

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
    professores: ProfessorAssignment[];
    days_of_week: number[];
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
    professores: ProfessorAssignment[];
    days_of_week: number[];
  }>>;
  cursos: Array<{ id: string; nome: string; carga_horaria: number }>;
  salas: Array<{ id: string; nome: string; cadeiras: number }>;
  professores: Array<{ id: string; nome: string; valor_hora: number }>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' }
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Segunda-feira', short: 'Seg' },
  { value: 2, label: 'Terça-feira', short: 'Ter' },
  { value: 3, label: 'Quarta-feira', short: 'Qua' },
  { value: 4, label: 'Quinta-feira', short: 'Qui' },
  { value: 5, label: 'Sexta-feira', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 7, label: 'Domingo', short: 'Dom' }
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
  if (!isOpen) return null;

  const selectedCurso = cursos.find(c => c.id === formData.curso_id);
  const totalHorasProfessores = formData.professores.reduce((total, prof) => total + prof.hours, 0);
  const cargaHorariaCurso = selectedCurso?.carga_horaria || 0;
  const horasValidas = totalHorasProfessores === cargaHorariaCurso;

  function addProfessor() {
    setFormData({
      ...formData,
      professores: [...formData.professores, { professor_id: '', hours: 0 }]
    });
  }

  function removeProfessor(index: number) {
    const newProfessores = formData.professores.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      professores: newProfessores
    });
  }

  function updateProfessor(index: number, field: keyof ProfessorAssignment, value: string | number) {
    const newProfessores = [...formData.professores];
    newProfessores[index] = {
      ...newProfessores[index],
      [field]: field === 'hours' ? Number(value) : value
    };
    setFormData({
      ...formData,
      professores: newProfessores
    });
  }

  function toggleDayOfWeek(dayValue: number) {
    const currentDays = formData.days_of_week || [];
    const isSelected = currentDays.includes(dayValue);
    
    if (isSelected) {
      setFormData({
        ...formData,
        days_of_week: currentDays.filter(day => day !== dayValue)
      });
    } else {
      setFormData({
        ...formData,
        days_of_week: [...currentDays, dayValue].sort()
      });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!horasValidas && cargaHorariaCurso > 0) {
      alert(`O total de horas dos professores (${totalHorasProfessores}h) deve ser igual à carga horária do curso (${cargaHorariaCurso}h)`);
      return;
    }

    if (!formData.days_of_week || formData.days_of_week.length === 0) {
      alert('Selecione pelo menos um dia da semana para a turma');
      return;
    }

    onSubmit(e);
  }

  return createPortal(
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
                {salas.map(sala => (
                  <option key={sala.id} value={sala.id}>
                    {sala.nome} ({sala.cadeiras} cadeiras)
                  </option>
                ))}
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
                  <option key={period.value} value={period.value}>
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
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-400 mb-1">
                Data de Início
              </label>
              <input
                type="date"
                id="start_date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                required
              />
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-400 mb-1">
                Data de Término
              </label>
              <input
                type="date"
                id="end_date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                required
              />
            </div>
          </div>

          {/* Seção de Dias da Semana */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-accent" />
              <h3 className="text-lg font-medium text-white">Dias da Semana</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDayOfWeek(day.value)}
                  className={`p-3 rounded-lg border transition-colors text-sm ${
                    (formData.days_of_week || []).includes(day.value)
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
              {(formData.days_of_week || []).length === 0 ? (
                <span className="text-red-400">⚠️ Selecione pelo menos um dia da semana</span>
              ) : (
                <span>
                  Selecionados: {(formData.days_of_week || []).map(dayValue => 
                    DAYS_OF_WEEK.find(d => d.value === dayValue)?.short
                  ).join(', ')}
                </span>
              )}
            </div>
          </div>

          {/* Seção de Professores */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Professores
              </h3>
              <button
                type="button"
                onClick={addProfessor}
                className="flex items-center gap-2 px-3 py-1 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                Adicionar Professor
              </button>
            </div>

            {formData.professores.length > 0 && (
              <div className="space-y-3">
                {formData.professores.map((professorAssignment, index) => (
                  <div key={index} className="bg-dark-lighter rounded-lg p-4 border border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Professor
                        </label>
                        <select
                          value={professorAssignment.professor_id}
                          onChange={(e) => updateProfessor(index, 'professor_id', e.target.value)}
                          className="w-full bg-dark border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                          required
                        >
                          <option value="">Selecione um professor</option>
                          {professores
                            .filter(prof => 
                              !formData.professores.some((pa, i) => 
                                i !== index && pa.professor_id === prof.id
                              )
                            )
                            .map(professor => (
                              <option key={professor.id} value={professor.id}>
                                {professor.nome}
                              </option>
                            ))
                          }
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Horas
                          </label>
                          <input
                            type="number"
                            value={professorAssignment.hours}
                            onChange={(e) => updateProfessor(index, 'hours', e.target.value)}
                            className="w-full bg-dark border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                            min="0"
                            step="0.5"
                            required
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProfessor(index)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remover professor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Resumo das horas */}
            {cargaHorariaCurso > 0 && (
              <div className={`p-3 rounded-lg border ${
                horasValidas 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                <div className="flex justify-between items-center text-sm">
                  <span>Total de horas dos professores:</span>
                  <span className="font-semibold">{totalHorasProfessores}h</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Carga horária do curso:</span>
                  <span className="font-semibold">{cargaHorariaCurso}h</span>
                </div>
                {!horasValidas && (
                  <div className="mt-2 text-xs">
                    {totalHorasProfessores < cargaHorariaCurso 
                      ? `Faltam ${cargaHorariaCurso - totalHorasProfessores}h para completar a carga horária`
                      : `Excesso de ${totalHorasProfessores - cargaHorariaCurso}h na carga horária`
                    }
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button
            type="submit"
            className={`w-full font-medium rounded-lg px-4 py-2 transition-colors ${
              (horasValidas || cargaHorariaCurso === 0) && (formData.days_of_week || []).length > 0
                ? 'bg-teal-accent text-dark hover:bg-teal-accent/90'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
            disabled={(!horasValidas && cargaHorariaCurso > 0) || (formData.days_of_week || []).length === 0}
          >
            {editingId ? 'Atualizar' : 'Criar Turma'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}