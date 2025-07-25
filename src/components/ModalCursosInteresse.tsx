import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Plus, Trash2, Users, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';

interface Curso {
  id: string;
  nome: string;
  preco: number;
}

interface InteresseCurso {
  id: string;
  curso_id: string;
  status: 'interested' | 'enrolled' | 'completed';
  curso: Curso;
}

interface ModalCursosInteresseProps {
  isOpen: boolean;
  onClose: () => void;
  alunoId: string;
  alunoNome: string;
}

export function ModalCursosInteresse({ 
  isOpen, 
  onClose, 
  alunoId, 
  alunoNome 
}: ModalCursosInteresseProps) {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [interessesAtivos, setInteressesAtivos] = useState<InteresseCurso[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingInterest, setAddingInterest] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, alunoId]);

  async function loadData() {
    setLoading(true);
    try {
      const [cursosResult, interessesResult] = await Promise.all([
        supabase
          .from('cursos')
          .select('id, nome, preco')
          .order('nome'),
        supabase
          .from('aluno_curso_interests')
          .select(`
            id,
            curso_id,
            status,
            curso:cursos(id, nome, preco)
          `)
          .eq('aluno_id', alunoId)
      ]);

      if (cursosResult.error) throw cursosResult.error;
      if (interessesResult.error) throw interessesResult.error;

      setCursos(cursosResult.data);
      setInteressesAtivos(interessesResult.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddInterest() {
    if (!selectedCurso) {
      toast.error('Selecione um curso');
      return;
    }

    // Check if interest already exists
    const existingInterest = interessesAtivos.find(i => i.curso_id === selectedCurso);
    if (existingInterest) {
      toast.error('Aluno já tem interesse neste curso');
      return;
    }

    setAddingInterest(true);
    try {
      const { data, error } = await supabase
        .from('aluno_curso_interests')
        .insert([{
          aluno_id: alunoId,
          curso_id: selectedCurso,
          status: 'interested'
        }])
        .select(`
          id,
          curso_id,
          status,
          curso:cursos(id, nome, preco)
        `)
        .single();

      if (error) throw error;

      setInteressesAtivos(prev => [...prev, data]);
      setSelectedCurso('');
      toast.success('Interesse adicionado com sucesso!');
    } catch (error) {
      toast.error('Erro ao adicionar interesse');
    } finally {
      setAddingInterest(false);
    }
  }

  async function handleRemoveInterest(interesseId: string) {
    try {
      const { error } = await supabase
        .from('aluno_curso_interests')
        .delete()
        .eq('id', interesseId);

      if (error) throw error;

      setInteressesAtivos(prev => prev.filter(i => i.id !== interesseId));
      toast.success('Interesse removido com sucesso!');
    } catch (error) {
      toast.error('Erro ao remover interesse');
    }
  }

  async function handleChangeStatus(interesseId: string, newStatus: 'interested' | 'enrolled' | 'completed') {
    try {
      const { error } = await supabase
        .from('aluno_curso_interests')
        .update({ status: newStatus })
        .eq('id', interesseId);

      if (error) throw error;

      setInteressesAtivos(prev => 
        prev.map(i => 
          i.id === interesseId 
            ? { ...i, status: newStatus }
            : i
        )
      );
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'interested': return 'Interessado';
      case 'enrolled': return 'Cursando';
      case 'completed': return 'Concluído';
      default: return status;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'interested': return 'text-blue-400 bg-blue-500/20';
      case 'enrolled': return 'text-green-400 bg-green-500/20';
      case 'completed': return 'text-purple-400 bg-purple-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  }

  // Get available courses (not already interested)
  const cursosDisponiveis = cursos.filter(curso => 
    !interessesAtivos.some(interesse => interesse.curso_id === curso.id)
  );

  // Calculate potential revenue
  const faturamentoPotencial = interessesAtivos
    .filter(i => i.status === 'interested')
    .reduce((total, interesse) => total + interesse.curso.preco, 0);

  function handleClose() {
    setSelectedCurso('');
    onClose();
  }

  return createPortal(
    isOpen ? (
      <div 
        className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <div 
          className="bg-dark-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-blue-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">Gerenciar Cursos</h2>
                <p className="text-gray-400 text-sm">{alunoNome}</p>
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

          {/* Add new interest */}
          <div className="mb-6 p-4 bg-dark-lighter rounded-lg border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-400" />
              Adicionar Interesse
            </h3>
            <div className="flex gap-3">
              <select
                value={selectedCurso}
                onChange={(e) => setSelectedCurso(e.target.value)}
                className="flex-1 bg-dark border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={addingInterest}
              >
                <option value="">Selecione um curso</option>
                {cursosDisponiveis.map(curso => (
                  <option key={curso.id} value={curso.id}>
                    {curso.nome} - {formatCurrency(curso.preco)}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddInterest}
                disabled={!selectedCurso || addingInterest}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {addingInterest ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Adicionando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Current interests */}
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-accent" />
              Interesses Atuais ({interessesAtivos.length})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent"></div>
              </div>
            ) : interessesAtivos.length > 0 ? (
              <div className="space-y-3">
                {interessesAtivos.map((interesse) => (
                  <div key={interesse.id} className="bg-dark-lighter rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{interesse.curso.nome}</h4>
                        <p className="text-gray-400 text-sm">{formatCurrency(interesse.curso.preco)}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveInterest(interesse.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remover interesse"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Status:</span>
                      <select
                        value={interesse.status}
                        onChange={(e) => handleChangeStatus(interesse.id, e.target.value as any)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium border-0 focus:outline-none focus:ring-2 focus:ring-blue-400 ${getStatusColor(interesse.status)}`}
                      >
                        <option value="interested">Interessado</option>
                        <option value="enrolled">Cursando</option>
                        <option value="completed">Concluído</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                <p>Nenhum interesse em cursos</p>
                <p className="text-sm mt-1">Adicione um curso acima para começar</p>
              </div>
            )}
          </div>

          {/* Summary */}
          {interessesAtivos.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-blue-400 font-semibold">
                    {interessesAtivos.filter(i => i.status === 'interested').length}
                  </div>
                  <div className="text-gray-400 text-sm">Interessado</div>
                </div>
                <div>
                  <div className="text-green-400 font-semibold">
                    {interessesAtivos.filter(i => i.status === 'enrolled').length}
                  </div>
                  <div className="text-gray-400 text-sm">Cursando</div>
                </div>
                <div>
                  <div className="text-purple-400 font-semibold">
                    {interessesAtivos.filter(i => i.status === 'completed').length}
                  </div>
                  <div className="text-gray-400 text-sm">Concluído</div>
                </div>
              </div>
              
              {faturamentoPotencial > 0 && (
                <div className="mt-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-emerald-400">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-semibold">
                      Potencial: {formatCurrency(faturamentoPotencial)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    ) : null,
    document.body
  );
}