import { createClient } from '@supabase/supabase-js';

/**
 * Configuração do cliente Supabase
 * 
 * Este arquivo configura e exporta o cliente Supabase usado em toda a aplicação.
 * O cliente é responsável por:
 * - Autenticação de usuários
 * - Operações CRUD no banco de dados
 * - Subscriptions em tempo real
 * - Gerenciamento de sessões
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validação das variáveis de ambiente obrigatórias
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable. Please add it to your .env file.');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable. Please add it to your .env file.');
}

// Validação do formato da URL
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid VITE_SUPABASE_URL format: "${supabaseUrl}". Please ensure it's a valid URL starting with https://`);
}

/**
 * Cliente Supabase configurado
 * 
 * Instância única do cliente Supabase que deve ser usada em toda a aplicação.
 * Configurado com:
 * - URL do projeto Supabase
 * - Chave anônima para acesso público
 * - Configurações de autenticação automática
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);