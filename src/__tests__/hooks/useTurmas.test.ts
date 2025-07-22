import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTurmas } from '../../hooks/useTurmas';
import { supabase } from '../../lib/supabase';

// Mock do Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          then: jest.fn()
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      })),
      delete: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }
}));

// Mock do react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useTurmas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty turmas array', () => {
    const { result } = renderHook(() => useTurmas(), {
      wrapper: createWrapper(),
    });

    expect(result.current.turmas).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('should provide mutation functions', () => {
    const { result } = renderHook(() => useTurmas(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.createTurma).toBe('function');
    expect(typeof result.current.updateTurma).toBe('function');
    expect(typeof result.current.deleteTurma).toBe('function');
  });

  it('should provide loading states', () => {
    const { result } = renderHook(() => useTurmas(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.isCreating).toBe('boolean');
    expect(typeof result.current.isUpdating).toBe('boolean');
    expect(typeof result.current.isDeleting).toBe('boolean');
  });
});