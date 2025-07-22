import { QueryClient } from '@tanstack/react-query';

/**
 * Configuração do QueryClient para gerenciamento de estado do servidor
 * 
 * Configurações otimizadas para o Pepper Heads CRM:
 * - Cache de 5 minutos para dados que mudam pouco (professores, salas, categorias)
 * - Cache de 2 minutos para dados dinâmicos (turmas, alunos)
 * - Retry automático em caso de falha de rede
 * - Refetch automático quando a janela ganha foco
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache padrão de 5 minutos
      staleTime: 5 * 60 * 1000,
      // Dados ficam no cache por 10 minutos
      gcTime: 10 * 60 * 1000,
      // Retry automático em caso de erro
      retry: (failureCount, error: any) => {
        // Não retry em erros de autenticação
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Máximo 3 tentativas
        return failureCount < 3;
      },
      // Refetch quando a janela ganha foco
      refetchOnWindowFocus: true,
      // Refetch quando reconecta à internet
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry automático para mutations
      retry: 1,
    },
  },
});