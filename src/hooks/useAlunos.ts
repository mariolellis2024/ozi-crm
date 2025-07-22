import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { supabase } from '../lib/supabase';

export interface Aluno {
  id: string;
  nome: string;
  email?: string;
  whatsapp: string;
  empresa?: string;
  available_periods?: ('manha' | 'tarde' | 'noite')[];
  curso_interests?: Array<{
    id?: string;
    curso_id: string;
    status: 'interested' | 'enrolled' | 'completed';
  }>;
  created_at: string;
}

export interface AlunoFormData {
  nome: string;
  email: string;
  whatsapp: string;
  empresa: string;
  available_periods: ('manha' | 'tarde' | 'noite')[];
}

/**
 * Hook para gerenciar alunos com cache otimizado
 */
export function useAlunos() {
  // Query para buscar alunos
  const alunosQuery = useSupabaseQuery(
    ['alunos'],
    async () => {
      const { data, error } = await supabase
        .from('alunos')
        .select(`
          *,
          curso_interests:aluno_curso_interests(
            id,
            curso_id,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const alunosData = data.map(aluno => ({
        ...aluno,
        curso_interests: aluno.curso_interests || []
      }));

      return { data: alunosData, error: null };
    },
    { staleTime: 2 * 60 * 1000 }
  );

  // Query para buscar cursos (para cálculo de faturamento)
  const cursosQuery = useSupabaseQuery(
    ['cursos'],
    async () => {
      return await supabase
        .from('cursos')
        .select('*')
        .order('nome');
    },
    { staleTime: 5 * 60 * 1000 }
  );

  // Mutation para criar aluno
  const createAlunoMutation = useSupabaseMutation(
    async (formData: AlunoFormData) => {
      return await supabase
        .from('alunos')
        .insert([formData])
        .select();
    },
    {
      successMessage: 'Aluno adicionado com sucesso!',
      errorMessage: 'Erro ao adicionar aluno',
      invalidateQueries: [['alunos'], ['suggestions']]
    }
  );

  // Mutation para atualizar aluno
  const updateAlunoMutation = useSupabaseMutation(
    async ({ id, formData }: { id: string; formData: AlunoFormData }) => {
      return await supabase
        .from('alunos')
        .update(formData)
        .eq('id', id)
        .select();
    },
    {
      successMessage: 'Aluno atualizado com sucesso!',
      errorMessage: 'Erro ao atualizar aluno',
      invalidateQueries: [['alunos']]
    }
  );

  // Mutation para deletar aluno
  const deleteAlunoMutation = useSupabaseMutation(
    async (id: string) => {
      return await supabase
        .from('alunos')
        .delete()
        .eq('id', id);
    },
    {
      successMessage: 'Aluno excluído com sucesso!',
      errorMessage: 'Erro ao excluir aluno',
      invalidateQueries: [['alunos'], ['suggestions']]
    }
  );

  // Calcular faturamento potencial
  const calculateOpenRevenue = (alunosData: Aluno[], cursosData: any[]) => {
    let total = 0;
    
    alunosData.forEach(aluno => {
      aluno.curso_interests?.forEach(interest => {
        if (interest.status === 'interested') {
          const curso = cursosData.find(c => c.id === interest.curso_id);
          if (curso) {
            total += curso.preco;
          }
        }
      });
    });
    
    return total;
  };

  const totalOpenRevenue = calculateOpenRevenue(
    alunosQuery.data || [],
    cursosQuery.data || []
  );

  return {
    // Dados
    alunos: alunosQuery.data || [],
    cursos: cursosQuery.data || [],
    totalOpenRevenue,
    isLoading: alunosQuery.isLoading || cursosQuery.isLoading,
    error: alunosQuery.error || cursosQuery.error,
    
    // Mutations
    createAluno: createAlunoMutation.mutate,
    updateAluno: updateAlunoMutation.mutate,
    deleteAluno: deleteAlunoMutation.mutate,
    
    // Estados das mutations
    isCreating: createAlunoMutation.isPending,
    isUpdating: updateAlunoMutation.isPending,
    isDeleting: deleteAlunoMutation.isPending,
  };
}