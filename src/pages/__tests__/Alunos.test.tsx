import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Alunos } from '../Alunos';
import { supabase } from '../../lib/supabase';

// Mock the supabase module
vi.mock('../../lib/supabase');

describe('Alunos Page', () => {
  const mockAlunos = [
    {
      id: '1',
      nome: 'João Silva',
      email: 'joao@email.com',
      whatsapp: '11999999999',
      empresa: 'Tech Corp',
      available_periods: ['manha', 'tarde'],
      created_at: '2024-01-01T10:00:00Z',
      curso_interests: [
        {
          id: '1',
          curso_id: 'curso-1',
          status: 'interested',
        },
      ],
    },
    {
      id: '2',
      nome: 'Maria Santos',
      email: 'maria@email.com',
      whatsapp: '11888888888',
      empresa: 'Design Studio',
      available_periods: ['noite'],
      created_at: '2024-01-02T10:00:00Z',
      curso_interests: [],
    },
  ];

  const mockCursos = [
    {
      id: 'curso-1',
      nome: 'React Avançado',
      preco: 2500,
    },
    {
      id: 'curso-2',
      nome: 'Node.js Fundamentals',
      preco: 2000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Supabase responses
    const mockSupabase = vi.mocked(supabase);
    
    // Mock the chained query methods
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Default successful responses
    mockQuery.range.mockResolvedValue({
      data: mockAlunos,
      error: null,
      count: mockAlunos.length,
    });

    // Mock cursos query
    mockQuery.select.mockImplementation((columns) => {
      if (columns?.includes('id, nome, preco')) {
        return Promise.resolve({
          data: mockCursos,
          error: null,
        });
      }
      return mockQuery;
    });
  });

  it('should render the page title and description', async () => {
    render(<Alunos />);

    expect(screen.getByText('Alunos')).toBeInTheDocument();
    expect(screen.getByText('Gerencie seus alunos e acompanhe o progresso nos cursos')).toBeInTheDocument();
  });

  it('should render the "Novo Aluno" button', async () => {
    render(<Alunos />);

    expect(screen.getByText('Novo Aluno')).toBeInTheDocument();
  });

  it('should display loading state initially', async () => {
    render(<Alunos />);

    expect(screen.getByText('Carregando alunos...')).toBeInTheDocument();
  });

  it('should display alunos data after loading', async () => {
    render(<Alunos />);

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    });

    expect(screen.getByText('joao@email.com')).toBeInTheDocument();
    expect(screen.getByText('11999999999')).toBeInTheDocument();
  });

  it('should display search input', async () => {
    render(<Alunos />);

    const searchInput = screen.getByPlaceholderText('Buscar alunos...');
    expect(searchInput).toBeInTheDocument();
  });

  it('should display filter options', async () => {
    render(<Alunos />);

    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('Interessados')).toBeInTheDocument();
    expect(screen.getByText('Cursando')).toBeInTheDocument();
    expect(screen.getByText('Concluídos')).toBeInTheDocument();
  });

  it('should display pagination info when there are students', async () => {
    render(<Alunos />);

    await waitFor(() => {
      expect(screen.getByText(/2 alunos cadastrados/)).toBeInTheDocument();
    });
  });

  it('should handle search input changes', async () => {
    render(<Alunos />);

    const searchInput = screen.getByPlaceholderText('Buscar alunos...');
    fireEvent.change(searchInput, { target: { value: 'João' } });

    expect(searchInput).toHaveValue('João');
  });

  it('should handle filter changes', async () => {
    render(<Alunos />);

    const interessadosFilter = screen.getByText('Interessados');
    fireEvent.click(interessadosFilter);

    // The filter should be visually active (has teal-accent background)
    expect(interessadosFilter.closest('button')).toHaveClass('bg-teal-accent');
  });

  it('should display "Gerenciar Cursos" buttons for each student', async () => {
    render(<Alunos />);

    await waitFor(() => {
      const gerenciarButtons = screen.getAllByText('Gerenciar Cursos');
      expect(gerenciarButtons).toHaveLength(2);
    });
  });

  it('should display available periods for students', async () => {
    render(<Alunos />);

    await waitFor(() => {
      expect(screen.getByText('Manhã')).toBeInTheDocument();
      expect(screen.getByText('Tarde')).toBeInTheDocument();
      expect(screen.getByText('Noite')).toBeInTheDocument();
    });
  });

  it('should handle empty state', async () => {
    // Mock empty response
    const mockSupabase = vi.mocked(supabase);
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      }),
      or: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery as any);

    render(<Alunos />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum aluno encontrado')).toBeInTheDocument();
    });
  });

  it('should display faturamento potencial', async () => {
    render(<Alunos />);

    await waitFor(() => {
      expect(screen.getByText('Faturamento Potencial em Aberto')).toBeInTheDocument();
    });
  });
});