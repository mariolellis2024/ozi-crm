/**
 * Utilitários para tratamento de erros
 */

export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

/**
 * Extrai uma mensagem de erro amigável do erro do Supabase
 */
export function getErrorMessage(error: any): string {
  if (!error) return 'Erro desconhecido';

  // Erros do Supabase
  if (error.message) {
    // Erros de violação de constraint
    if (error.code === '23505') {
      if (error.message.includes('email')) {
        return 'Este email já está cadastrado';
      }
      if (error.message.includes('nome')) {
        return 'Este nome já está em uso';
      }
      return 'Registro já existe';
    }

    // Erros de chave estrangeira
    if (error.code === '23503') {
      return 'Referência inválida - verifique os dados relacionados';
    }

    // Erros de validação
    if (error.code === '23514') {
      return 'Dados inválidos - verifique os valores informados';
    }

    // Erros de autenticação
    if (error.message.includes('Invalid login credentials')) {
      return 'Email ou senha incorretos';
    }

    if (error.message.includes('Email not confirmed')) {
      return 'Email não confirmado - verifique sua caixa de entrada';
    }

    // Retorna a mensagem original se não for um erro conhecido
    return error.message;
  }

  // Erros de rede
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return 'Erro de conexão - verifique sua internet';
  }

  return 'Erro desconhecido';
}

/**
 * Cria um objeto de erro padronizado
 */
export function createAppError(
  message: string,
  code?: string,
  details?: any
): AppError {
  return {
    message,
    code,
    details
  };
}

/**
 * Valida se um email é válido
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida se um WhatsApp é válido (formato brasileiro)
 */
export function isValidWhatsApp(whatsapp: string): boolean {
  // Remove caracteres não numéricos
  const numbers = whatsapp.replace(/\D/g, '');
  
  // Deve ter 10 ou 11 dígitos (com ou sem 9 no celular)
  return numbers.length >= 10 && numbers.length <= 11;
}

/**
 * Formata mensagens de erro para exibição
 */
export function formatErrorForDisplay(error: any): string {
  const message = getErrorMessage(error);
  
  // Capitaliza a primeira letra
  return message.charAt(0).toUpperCase() + message.slice(1);
}