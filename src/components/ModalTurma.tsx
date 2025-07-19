import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type Period = 'manha' | 'tarde' | 'noite';

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
  }>>;
  cursos: Array<{ id: string; nome: string }>;
  salas: Array<{ id: string; nome: string; cadeiras: number }>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' }
];

export function ModalTurma({ 
  isOpen, 
  editingId, 
  formData, 
  setFormData, 
  cursos,
  salas,
  onSubmit, 
  onClose 
}: ModalTurmaProps) {
  if (!isOpen) return null;

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

        <form onSubmit={onSubmit} className="space-y-4">
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

          <button
            type="submit"
            className="w-full bg-teal-accent text-dark font-medium rounded-lg px-4 py-2 hover:bg-teal-accent/90 transition-colors"
          >
            {editingId ? 'Atualizar' : 'Criar Turma'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}