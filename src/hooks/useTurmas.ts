import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '../lib/supabase';

export interface Turma {
  id: string;
  name: string;
  curso_id: string;
  sala_id: string;
  cadeiras: number;
  potencial_faturamento: number;
  period: 'manha' | 'tarde' | 'noite';
  start_date: string;
  end_date: string;
  imposto: number;
  days_of_week?: number[];
  created_at: string;
  curso?: {
    id: string;
    nome: string;
    preco: number;
    carga_horaria: number;
  };
  sala?: {
    id: string;
    nome: string;
    cadeiras: number;
  };
  professores?: Array<{
    id: string;
    professor_id: string;
    hours: number;
    professor: {
      id: string;
      nome: string;
      valor_hora: number;
    };
  }>;
  alunos_enrolled?: Array<{
    id: string;
    nome: string;
  }>;
}

export interface TurmaFormData {
  name: string;
  curso_id: string;
  sala_id: string;
  cadeiras: number;
  period: 'manha' | 'tarde' | 'noite';
  start_date: string;
  end_date: string;
  imposto: number;
  professores: Array<{
    professor_id: string;
    hours: number;
  }>;
  days_of_week: number[];
}

/**
 * Hook para gerenciar turmas com cache otimizado
 */
export function useTurmas() {
  // Query para buscar turmas
  const turmasQuery = useSupabaseQuery(
    ['turmas'],
    async () => {
      const { data, error } = await supabase
        .from('turmas')
        .select(`
          *,
          curso:cursos(*),
          sala:salas(*),
          professores:turma_professores(
            id,
            professor_id,
            hours,
            professor:professores(id, nome, valor_hora)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar alunos matriculados para cada turma
      const turmasWithEnrolled = await Promise.all(
        data.map(async (turma) => {
          const { data: enrolledStudents } = await supabase
            .from('aluno_curso_interests')
            .select(`
              aluno:alunos(id, nome)
            `)
            .eq('turma_id', turma.id)
            .eq('status', 'enrolled');

          return {
            ...turma,
            alunos_enrolled: enrolledStudents?.map(item => item.aluno) || []
          };
        })
      );

      return { data: turmasWithEnrolled, error: null };
    },
    { staleTime: 2 * 60 * 1000 } // Cache de 2 minutos para dados dinâmicos
  );

  // Mutation para criar turma
  const createTurmaMutation = useSupabaseMutation(
    async (formData: TurmaFormData & { potencial_faturamento: number }) => {
      const { professores, ...turmaData } = formData;

      // Criar turma
      const { data: turma, error: turmaError } = await supabase
        .from('turmas')
        .insert([turmaData])
        .select()
        .single();

      if (turmaError) return { data: null, error: turmaError };

      // Adicionar professores se houver
      if (professores.length > 0) {
        const assignments = professores
          .filter(prof => prof.professor_id && prof.professor_id.trim() !== '')
          .map(prof => ({
            turma_id: turma.id,
            professor_id: prof.professor_id,
            hours: prof.hours
          }));

        if (assignments.length > 0) {
          const { error: assignmentError } = await supabase
            .from('turma_professores')
            .insert(assignments);

          if (assignmentError) return { data: null, error: assignmentError };
        }
      }

      return { data: turma, error: null };
    },
    {
      successMessage: 'Turma criada com sucesso!',
      errorMessage: 'Erro ao criar turma',
      invalidateQueries: [['turmas'], ['suggestions']]
    }
  );

  // Mutation para atualizar turma
  const updateTurmaMutation = useSupabaseMutation(
    async ({ id, formData }: { id: string; formData: TurmaFormData & { potencial_faturamento: number } }) => {
      const { professores, ...turmaData } = formData;

      // Atualizar turma
      const { error: turmaError } = await supabase
        .from('turmas')
        .update(turmaData)
        .eq('id', id);

      if (turmaError) return { data: null, error: turmaError };

      // Remover professores existentes
      await supabase
        .from('turma_professores')
        .delete()
        .eq('turma_id', id);

      // Adicionar novos professores
      if (professores.length > 0) {
        const assignments = professores
          .filter(prof => prof.professor_id && prof.professor_id.trim() !== '')
          .map(prof => ({
            turma_id: id,
            professor_id: prof.professor_id,
            hours: prof.hours
          }));

        if (assignments.length > 0) {
          const { error: assignmentError } = await supabase
            .from('turma_professores')
            .insert(assignments);

          if (assignmentError) return { data: null, error: assignmentError };
        }
      }

      return { data: { id }, error: null };
    },
    {
      successMessage: 'Turma atualizada com sucesso!',
      errorMessage: 'Erro ao atualizar turma',
      invalidateQueries: [['turmas'], ['suggestions']]
    }
  );

  // Mutation para deletar turma
  const deleteTurmaMutation = useSupabaseMutation(
    async (id: string) => {
      return await supabase
        .from('turmas')
        .delete()
        .eq('id', id);
    },
    {
      successMessage: 'Turma excluída com sucesso!',
      errorMessage: 'Erro ao excluir turma',
      invalidateQueries: [['turmas'], ['suggestions']]
    }
  );

  return {
    // Dados
    turmas: turmasQuery.data || [],
    isLoading: turmasQuery.isLoading,
    error: turmasQuery.error,
    
    // Mutations
    createTurma: createTurmaMutation.mutate,
    updateTurma: updateTurmaMutation.mutate,
    deleteTurma: deleteTurmaMutation.mutate,
    
    // Estados das mutations
    isCreating: createTurmaMutation.isPending,
    isUpdating: updateTurmaMutation.isPending,
    isDeleting: deleteTurmaMutation.isPending,
  };
}