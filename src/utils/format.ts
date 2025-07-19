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
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}