import '@testing-library/jest-dom';

// Mock do Supabase para testes
global.fetch = jest.fn();

// Mock das variáveis de ambiente
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-key',
  },
});