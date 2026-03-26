/**
 * Utilitários de formatação
 * 
 * Este arquivo contém funções utilitárias para formatação de dados
 * usadas em toda a aplicação.
 */

/**
 * Formata um valor numérico como moeda brasileira (Real)
 * 
 * @param value - Valor numérico a ser formatado
 * @returns String formatada como moeda (ex: "R$ 1.500,00")
 * 
 * @example
 * formatCurrency(1500) // "R$ 1.500,00"
 * formatCurrency(0) // "R$ 0,00"
 * formatCurrency(999.99) // "R$ 999,99"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Formata um número de telefone brasileiro com máscara
 * 
 * @param phone - Número de telefone (pode conter formatação)
 * @returns String formatada (ex: "(11) 99999-9999")
 */
export function formatPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 13 && digits.startsWith('55')) {
    return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return phone;
}