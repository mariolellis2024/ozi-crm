import React from 'react';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';

interface ProfessorAssignment {
  professor_id: string;
  hours: number;
}

interface ProfessorListProps {
  professores: ProfessorAssignment[];
  availableProfessores: Array<{ id: string; nome: string; valor_hora: number; unidade_id?: string }>;
  salas: Array<{ id: string; nome: string; cadeiras: number; unidade_id?: string; unidade_nome?: string }>;
  selectedSalaId: string;
  cargaHorariaCurso: number;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof ProfessorAssignment, value: string | number) => void;
}

export function ProfessorList({
  professores,
  availableProfessores,
  salas,
  selectedSalaId,
  cargaHorariaCurso,
  onAdd,
  onRemove,
  onUpdate,
}: ProfessorListProps) {
  const totalHorasProfessores = professores.reduce((total, prof) => total + prof.hours, 0);
  const horasValidas = totalHorasProfessores === cargaHorariaCurso;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Professores
        </h3>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 px-3 py-1 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          Adicionar Professor
        </button>
      </div>

      {professores.length > 0 && (
        <div className="space-y-3">
          {professores.map((professorAssignment, index) => (
            <div key={index} className="bg-dark-lighter rounded-lg p-4 border border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Professor
                  </label>
                  <select
                    value={professorAssignment.professor_id}
                    onChange={(e) => onUpdate(index, 'professor_id', e.target.value)}
                    className="w-full bg-dark border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                    required
                  >
                    <option value="">Selecione um professor</option>
                    {(() => {
                      const selectedSala = salas.find(s => s.id === selectedSalaId);
                      return availableProfessores
                        .filter(prof => {
                          const alreadySelected = professores.some((pa, i) => 
                            i !== index && pa.professor_id === prof.id
                          );
                          if (alreadySelected) return false;
                          if (selectedSala?.unidade_id && prof.unidade_id) {
                            return prof.unidade_id === selectedSala.unidade_id;
                          }
                          return true;
                        })
                        .map(professor => (
                          <option key={professor.id} value={professor.id}>
                            {professor.nome}
                          </option>
                        ));
                    })()}
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
                      onChange={(e) => onUpdate(index, 'hours', e.target.value)}
                      className="w-full bg-dark border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                      min="0"
                      step="0.5"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
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
  );
}
