import { useSupabaseQuery } from './useSupabaseQuery';
import { supabase } from '../lib/supabase';

export interface Suggestion {
  cursoId: string;
  cursoNome: string;
  melhorPeriodo: 'manha' | 'tarde' | 'noite';
  totalInteressados: number;
  faturamentoPotencial: number;
  precoUnitario: number;
}

/**
 * Hook para gerar sugestões de turmas baseadas na demanda
 */
export function useSuggestions() {
  return useSupabaseQuery(
    ['suggestions'],
    async () => {
      // Buscar interesses dos alunos
      const { data: interessesAlunos, error: interessesError } = await supabase
        .from('aluno_curso_interests')
        .select(`
          curso_id,
          status,
          aluno:alunos(available_periods)
        `)
        .eq('status', 'interested');

      if (interessesError) throw interessesError;

      // Buscar cursos
      const { data: cursos, error: cursosError } = await supabase
        .from('cursos')
        .select('*');

      if (cursosError) throw cursosError;

      // Agrupar por curso e período
      const sugestoes = interessesAlunos.reduce((acc: any, interesse) => {
        const cursoId = interesse.curso_id;
        const periodos = interesse.aluno?.available_periods || ['manha', 'tarde', 'noite'];
        
        if (!acc[cursoId]) {
          acc[cursoId] = { manha: 0, tarde: 0, noite: 0 };
        }
        
        periodos.forEach((periodo: 'manha' | 'tarde' | 'noite') => {
          acc[cursoId][periodo]++;
        });
        
        return acc;
      }, {});

      // Filtrar cursos com demanda suficiente (>= 3 interessados)
      const cursosComDemanda = Object.entries(sugestoes)
        .filter(([cursoId, demanda]: [string, any]) => {
          const maxDemanda = Math.max(...Object.values(demanda));
          return maxDemanda >= 3;
        })
        .map(([cursoId, demanda]: [string, any]) => {
          const curso = cursos.find(c => c.id === cursoId);
          if (!curso) return null;
          
          const melhorPeriodo = Object.entries(demanda)
            .reduce((a: [string, number], b: [string, number]) => a[1] > b[1] ? a : b)[0] as 'manha' | 'tarde' | 'noite';
          const totalInteressados = Math.max(...Object.values(demanda));
          
          return {
            cursoId,
            cursoNome: curso.nome,
            melhorPeriodo,
            totalInteressados,
            faturamentoPotencial: totalInteressados * curso.preco,
            precoUnitario: curso.preco
          };
        })
        .filter((item): item is Suggestion => item !== null)
        .sort((a, b) => b.faturamentoPotencial - a.faturamentoPotencial);

      return { data: cursosComDemanda, error: null };
    },
    { staleTime: 3 * 60 * 1000 } // Cache de 3 minutos
  );
}