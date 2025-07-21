import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Users, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';

interface AlunoInteressado {
  id: string;
  nome: string;
  email?: string;
  whatsapp: string;
  empresa?: string;
  available_periods?: string[];
}

interface ModalAlunosInteressadosProps {
  isOpen: boolean;
  onClose: () => void;
  turmaId: string;
  cursoId: string;
  turmaPeriod: string;
  cursoNome: string;
  cursoPreco: number;
  onStudentEnrolled: () => void;
}

export function ModalAlunosInteressados({ 
  isOpen, 
  onClose, 
  turmaId, 
  cursoId, 
  turmaPeriod,
  cursoNome,
  cursoPreco,
  onStudentEnrolled
}: ModalAlunosInteressadosProps) {
  const [alunosInteressados, setAlunosInteressados] = useState<AlunoInteressado[]>([]);
  const [filteredAlunos, setFilteredAlunos] = useState<AlunoInteressado[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrollingStudents, setEnrollingStudents] = useState<Set<string>>(new Set());
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [turmaCapacity, setTurmaCapacity] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadAlunosInteressados();
      loadTurmaInfo();
    }
  }, [isOpen, cursoId, turmaPeriod]);

  useEffect(() => {
    // Filter students based on search term
    const filtered = alunosInteressados.filter(aluno =>
      aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aluno.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aluno.whatsapp.includes(searchTerm)
    );
    setFilteredAlunos(filtered);
  }, [alunosInteressados, searchTerm]);

  async function loadAlunosInteressados() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('aluno_curso_interests')
        .select(`
          aluno:alunos(
            id,
            nome,
            email,
            whatsapp,
            empresa,
            available_periods
          )
        `)
        .eq('curso_id', cursoId)
        .eq('status', 'interested')
        .is('turma_id', null);

      if (error) throw error;

      // Filter students who are available in the turma period
      const alunosData = data
        .map(item => item.aluno)
        .filter(aluno => {
          // If student has no period preferences, include them
          if (!aluno.available_periods || aluno.available_periods.length === 0) {
            return true;
          }
          // Check if student is available in the turma period
          return aluno.available_periods.includes(turmaPeriod);
        });

      setAlunosInteressados(alunosData);
    } catch (error) {
      toast.error('Erro ao carregar alunos interessados');
    } finally {
      setLoading(false);
    }
  }

  async function loadTurmaInfo() {
    try {
      const [turmaResult, enrolledResult] = await Promise.all([
        supabase
          .from('turmas')
          .select('cadeiras')
          .eq('id', turmaId)
          .single(),
        supabase
          .from('aluno_curso_interests')
          .select('id')
          .eq('turma_id', turmaId)
          .eq('status', 'enrolled')
      ]);

      if (turmaResult.error) throw turmaResult.error;
      if (enrolledResult.error) throw enrolledResult.error;

      setTurmaCapacity(turmaResult.data.cadeiras);
      setEnrolledCount(enrolledResult.data.length);
    } catch (error) {
      console.error('Erro ao carregar informações da turma:', error);
    }
  }

  async function handleEnrollStudent(alunoId: string) {
    // Verificar se ainda há vagas disponíveis
    if (enrolledCount >= turmaCapacity) {
      toast.error('Turma lotada! Não há mais vagas disponíveis.');
      return;
    }

    // Verificar conflitos de horário
    try {
      const hasConflict = await checkStudentScheduleConflict(alunoId, turmaId);
      if (hasConflict) {
        toast.error('Conflito de horário! O aluno já está matriculado em outra turma no mesmo período e com datas sobrepostas.');
        return;
      }
    } catch (error) {
      toast.error('Erro ao verificar conflitos de horário');
      return;
    }

    setEnrollingStudents(prev => new Set(prev).add(alunoId));
    
    try {
      const { error } = await supabase
        .from('aluno_curso_interests')
        .update({ 
          status: 'enrolled',
          turma_id: turmaId
        })
        .eq('aluno_id', alunoId)
        .eq('curso_id', cursoId);
      
      if (error) throw error;
      
      toast.success('Aluno matriculado na turma!');
      
      // Remove the enrolled student from the list
      setAlunosInteressados(prev => prev.filter(aluno => aluno.id !== alunoId));
      
      // Update enrolled count
      setEnrolledCount(prev => prev + 1);
      
      // Notify parent component to refresh data
      onStudentEnrolled();
    } catch (error) {
      toast.error('Erro ao matricular aluno');
    } finally {
      setEnrollingStudents(prev => {
        const newSet = new Set(prev);
        newSet.delete(alunoId);
        return newSet;
      });
    }
  }

  async function checkStudentScheduleConflict(alunoId: string, newTurmaId: string): Promise<boolean> {
    try {
      // Buscar informações da nova turma
      const { data: newTurma, error: newTurmaError } = await supabase
        .from('turmas')
        .select('period, start_date, end_date')
        .eq('id', newTurmaId)
        .single();

      if (newTurmaError) throw newTurmaError;

      // Buscar todas as turmas em que o aluno já está matriculado
      const { data: enrolledTurmas, error: enrolledError } = await supabase
        .from('aluno_curso_interests')
        .select(`
          turma:turmas(
            id,
            period,
            start_date,
            end_date
          )
        `)
        .eq('aluno_id', alunoId)
        .eq('status', 'enrolled')
        .not('turma_id', 'is', null);

      if (enrolledError) throw enrolledError;

      // Verificar conflitos
      const newStartDate = new Date(newTurma.start_date + 'T00:00:00');
      const newEndDate = new Date(newTurma.end_date + 'T00:00:00');

      for (const enrollment of enrolledTurmas) {
        if (!enrollment.turma) continue;

        const existingTurma = enrollment.turma;
        
        // Verificar se é o mesmo período
        if (existingTurma.period === newTurma.period) {
          // Verificar sobreposição de datas
          const existingStartDate = new Date(existingTurma.start_date + 'T00:00:00');
          const existingEndDate = new Date(existingTurma.end_date + 'T00:00:00');

          const hasDateOverlap = (
            (newStartDate <= existingEndDate && newEndDate >= existingStartDate)
          );

          if (hasDateOverlap) {
            return true; // Conflito encontrado
          }
        }
      }

      return false; // Sem conflitos
    } catch (error) {
      console.error('Erro ao verificar conflitos de horário:', error);
      throw error;
    }
  }

  function handleClose() {
    setSearchTerm('');
    onClose();
  }

  if (!isOpen) return null;

  return createPortal(
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
            <Users className="h-6 w-6 text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Alunos Interessados</h2>
              <p className="text-gray-400 text-sm">{cursoNome}</p>
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

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-lighter border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent"></div>
            </div>
          ) : filteredAlunos.length > 0 ? (
            <div className="space-y-3">
              {filteredAlunos.map((aluno) => (
                <div key={aluno.id} className="bg-dark-lighter rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="h-4 w-4 text-blue-400" />
                        <h3 className="font-semibold text-white">{aluno.nome}</h3>
                      </div>
                      <div className="space-y-1 text-sm text-gray-400">
                        {aluno.email && <div>📧 {aluno.email}</div>}
                        <div>📱 {aluno.whatsapp}</div>
                        {aluno.empresa && <div>🏢 {aluno.empresa}</div>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleEnrollStudent(aluno.id)}
                      disabled={enrollingStudents.has(aluno.id)}
                      disabled={enrollingStudents.has(aluno.id) || enrolledCount >= turmaCapacity}
                      className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                        enrolledCount >= turmaCapacity 
                          ? 'bg-gray-500 text-gray-300' 
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {enrollingStudents.has(aluno.id) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Matriculando...
                        </>
                      ) : enrolledCount >= turmaCapacity ? (
                        'Turma Lotada'
                      ) : (
                        'Matricular'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              {searchTerm ? (
                <div>
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                  <p>Nenhum aluno encontrado com "{searchTerm}"</p>
                </div>
              ) : (
                <div>
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                  <p>Nenhum aluno interessado disponível para este período</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Informações da turma */}
        <div className="mb-4 p-3 bg-dark-lighter rounded-lg border border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Vagas da turma:</span>
            <span className={`font-semibold ${
              enrolledCount >= turmaCapacity ? 'text-red-400' : 'text-green-400'
            }`}>
              {enrolledCount}/{turmaCapacity}
            </span>
          </div>
          {enrolledCount >= turmaCapacity && (
            <div className="mt-2 text-xs text-red-400">
              ⚠️ Turma lotada - Não é possível matricular mais alunos
            </div>
          )}
        </div>

        {filteredAlunos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-400">
                <div>{filteredAlunos.length} aluno{filteredAlunos.length !== 1 ? 's' : ''} interessado{filteredAlunos.length !== 1 ? 's' : ''}</div>
                <div className="text-xs mt-1">
                  {Math.max(0, turmaCapacity - enrolledCount)} vaga{Math.max(0, turmaCapacity - enrolledCount) !== 1 ? 's' : ''} disponível{Math.max(0, turmaCapacity - enrolledCount) !== 1 ? 'eis' : ''}
                </div>
              </div>
              <span className="text-emerald-400 font-semibold">
                Potencial: {formatCurrency(cursoPreco * filteredAlunos.length)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}