import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Clock, BookOpen, Save, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

type Period = 'manha' | 'tarde' | 'noite';

interface ModalBulkEditProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudentIds: string[];
  cursos: Array<{ id: string; nome: string; preco: number }>;
  onSuccess: () => void;
}

interface BulkEditData {
  updatePeriods: boolean;
  periods: Period[];
  updateInterests: boolean;
  addInterests: string[];
  removeInterests: string[];
}

const PERIODS: { value: Period; label: string; color: string }[] = [
  { value: 'manha', label: 'Manhã', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30' },
  { value: 'tarde', label: 'Tarde', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30' },
  { value: 'noite', label: 'Noite', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30' }
];

export function ModalBulkEdit({ 
  isOpen, 
  onClose, 
  selectedStudentIds, 
  cursos,
  onSuccess 
}: ModalBulkEditProps) {
  const [loading, setLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Array<{ id: string; nome: string }>>([]);
  const [formData, setFormData] = useState<BulkEditData>({
    updatePeriods: false,
    periods: [],
    updateInterests: false,
    addInterests: [],
    removeInterests: []
  });

  useEffect(() => {
    if (isOpen && selectedStudentIds.length > 0) {
      loadSelectedStudents();
    }
  }, [isOpen, selectedStudentIds]);

  async function loadSelectedStudents() {
    try {
      const data = await api.get(`/api/alunos?ids=${selectedStudentIds.join(',')}`);
      setSelectedStudents(data.data || data);
    } catch (error) {
      toast.error('Erro ao carregar dados dos alunos selecionados');
    }
  }

  function togglePeriod(period: Period) {
    const currentPeriods = formData.periods;
    const isSelected = currentPeriods.includes(period);
    
    if (isSelected) {
      setFormData({
        ...formData,
        periods: currentPeriods.filter(p => p !== period)
      });
    } else {
      setFormData({
        ...formData,
        periods: [...currentPeriods, period]
      });
    }
  }

  function toggleAddInterest(cursoId: string) {
    const currentInterests = formData.addInterests;
    const isSelected = currentInterests.includes(cursoId);
    
    if (isSelected) {
      setFormData({
        ...formData,
        addInterests: currentInterests.filter(id => id !== cursoId)
      });
    } else {
      setFormData({
        ...formData,
        addInterests: [...currentInterests, cursoId]
      });
    }
  }

  function toggleRemoveInterest(cursoId: string) {
    const currentInterests = formData.removeInterests;
    const isSelected = currentInterests.includes(cursoId);
    
    if (isSelected) {
      setFormData({
        ...formData,
        removeInterests: currentInterests.filter(id => id !== cursoId)
      });
    } else {
      setFormData({
        ...formData,
        removeInterests: [...currentInterests, cursoId]
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.updatePeriods && !formData.updateInterests) {
      toast.error('Selecione pelo menos uma opção para atualizar');
      return;
    }

    setLoading(true);

    try {
      // Atualizar períodos disponíveis
      if (formData.updatePeriods) {
        // Update each student's periods via the API
        for (const studentId of selectedStudentIds) {
          await api.put(`/api/alunos/${studentId}`, { available_periods: formData.periods });
        }
      }

      // Gerenciar interesses em cursos
      if (formData.updateInterests) {
        // Adicionar novos interesses
        if (formData.addInterests.length > 0) {
          await api.post('/api/interests/bulk', {
            action: 'add',
            aluno_ids: selectedStudentIds,
            curso_ids: formData.addInterests
          });
        }

        // Remover interesses existentes
        if (formData.removeInterests.length > 0) {
          await api.post('/api/interests/bulk', {
            action: 'remove',
            aluno_ids: selectedStudentIds,
            curso_ids: formData.removeInterests
          });
        }
      }

      toast.success(`${selectedStudentIds.length} aluno${selectedStudentIds.length > 1 ? 's' : ''} atualizado${selectedStudentIds.length > 1 ? 's' : ''} com sucesso!`);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Erro na operação em lote:', error);
      toast.error('Erro ao atualizar alunos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setFormData({
      updatePeriods: false,
      periods: [],
      updateInterests: false,
      addInterests: [],
      removeInterests: []
    });
    onClose();
  }

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-dark-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Edição em Lote</h2>
              <p className="text-gray-400 text-sm">
                {selectedStudentIds.length} aluno{selectedStudentIds.length > 1 ? 's' : ''} selecionado{selectedStudentIds.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lista de alunos selecionados */}
        <div className="mb-6 p-4 bg-dark-lighter rounded-lg border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Alunos Selecionados:</h3>
          <div className="flex flex-wrap gap-2">
            {selectedStudents.map(student => (
              <span 
                key={student.id}
                className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs"
              >
                {student.nome}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção de Horários Disponíveis */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="updatePeriods"
                checked={formData.updatePeriods}
                onChange={(e) => setFormData({ ...formData, updatePeriods: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-dark-lighter border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="updatePeriods" className="flex items-center gap-2 text-white font-medium">
                <Clock className="h-5 w-5 text-blue-400" />
                Atualizar Horários Disponíveis
              </label>
            </div>

            {formData.updatePeriods && (
              <div className="ml-7 space-y-3">
                <p className="text-sm text-gray-400">
                  Selecione os novos horários disponíveis (substituirá os horários atuais):
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {PERIODS.map(period => (
                    <button
                      key={period.value}
                      type="button"
                      onClick={() => togglePeriod(period.value)}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                        formData.periods.includes(period.value)
                          ? 'bg-teal-accent text-dark border border-teal-accent'
                          : `border ${period.color}`
                      }`}
                    >
                      <span className="text-sm">{period.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Seção de Interesses em Cursos */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="updateInterests"
                checked={formData.updateInterests}
                onChange={(e) => setFormData({ ...formData, updateInterests: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-dark-lighter border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="updateInterests" className="flex items-center gap-2 text-white font-medium">
                <BookOpen className="h-5 w-5 text-green-400" />
                Gerenciar Interesses em Cursos
              </label>
            </div>

            {formData.updateInterests && (
              <div className="ml-7 space-y-4">
                {/* Adicionar Interesses */}
                <div>
                  <h4 className="text-sm font-medium text-green-400 mb-2">Adicionar Interesse nos Cursos:</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {cursos.map(curso => (
                      <label key={curso.id} className="flex items-center gap-2 p-2 bg-dark-lighter rounded-lg hover:bg-dark cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.addInterests.includes(curso.id)}
                          onChange={() => toggleAddInterest(curso.id)}
                          className="w-4 h-4 text-green-600 bg-dark border-gray-600 rounded focus:ring-green-500"
                        />
                        <span className="text-white text-sm">{curso.nome}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Remover Interesses */}
                <div>
                  <h4 className="text-sm font-medium text-red-400 mb-2">Remover Interesse nos Cursos:</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {cursos.map(curso => (
                      <label key={curso.id} className="flex items-center gap-2 p-2 bg-dark-lighter rounded-lg hover:bg-dark cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.removeInterests.includes(curso.id)}
                          onChange={() => toggleRemoveInterest(curso.id)}
                          className="w-4 h-4 text-red-600 bg-dark border-gray-600 rounded focus:ring-red-500"
                        />
                        <span className="text-white text-sm">{curso.nome}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-yellow-400">
                      <p className="font-medium">Atenção:</p>
                      <p>• Adicionar interesse: Criará interesse "interessado" se não existir</p>
                      <p>• Remover interesse: Excluirá completamente o interesse existente</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-dark-lighter text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (!formData.updatePeriods && !formData.updateInterests)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Atualizando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Aplicar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}