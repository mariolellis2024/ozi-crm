import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Hook para subscriptions em tempo real do Supabase
 * Invalida automaticamente as queries relacionadas quando há mudanças
 */
export function useRealtimeSubscription(
  table: string,
  queryKeysToInvalidate: string[][]
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', 
          { event: '*', schema: 'public', table },
          (payload) => {
            console.log(`Mudança em ${table}:`, payload);
            
            // Invalidar queries relacionadas
            queryKeysToInvalidate.forEach(queryKey => {
              queryClient.invalidateQueries({ queryKey });
            });
          }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [table, queryClient, queryKeysToInvalidate]);
}

/**
 * Hook específico para subscriptions de turmas
 */
export function useTurmasRealtime() {
  useRealtimeSubscription('turmas', [
    ['turmas'],
    ['suggestions']
  ]);
}

/**
 * Hook específico para subscriptions de alunos
 */
export function useAlunosRealtime() {
  useRealtimeSubscription('alunos', [
    ['alunos'],
    ['suggestions']
  ]);
}

/**
 * Hook específico para subscriptions de interesses de alunos
 */
export function useAlunoInterestsRealtime() {
  useRealtimeSubscription('aluno_curso_interests', [
    ['alunos'],
    ['turmas'],
    ['suggestions']
  ]);
}