import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

/**
 * Hook personalizado para queries do Supabase com cache otimizado
 */
export function useSupabaseQuery<T>(
  key: string[],
  queryFn: () => Promise<{ data: T; error: any }>,
  options?: {
    staleTime?: number;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const result = await queryFn();
      if (result.error) {
        throw new Error(result.error.message || 'Erro ao carregar dados');
      }
      return result.data;
    },
    staleTime: options?.staleTime,
    enabled: options?.enabled,
  });
}

/**
 * Hook para mutations do Supabase com invalidação automática de cache
 */
export function useSupabaseMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<{ data: TData; error: any }>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    invalidateQueries?: string[][];
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const result = await mutationFn(variables);
      if (result.error) {
        throw new Error(result.error.message || 'Erro na operação');
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }

      // Mostrar mensagem de sucesso
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }

      // Callback personalizado
      options?.onSuccess?.(data, variables);
    },
    onError: (error: Error, variables) => {
      // Mostrar mensagem de erro
      const errorMessage = options?.errorMessage || error.message || 'Erro na operação';
      toast.error(errorMessage);

      // Callback personalizado
      options?.onError?.(error, variables);
    },
  });
}