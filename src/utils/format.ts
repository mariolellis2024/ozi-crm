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

/**
 * Utilitários para trabalhar com datas no fuso horário GMT-3 (Brasília)
 */

/**
 * Converte uma string de data para o fuso horário GMT-3
 * 
 * @param dateString - String da data no formato YYYY-MM-DD
 * @returns Objeto Date ajustado para GMT-3
 */
export function parseDate(dateString: string): Date {
  // Cria a data assumindo GMT-3 (UTC-3)
  const date = new Date(dateString + 'T00:00:00-03:00');
  return date;
}

/**
 * Formata uma data para exibição no formato brasileiro
 * 
 * @param dateString - String da data no formato YYYY-MM-DD
 * @returns String formatada como DD/MM/YYYY
 */
export function formatDate(dateString: string): string {
  const date = parseDate(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  });
}

/**
 * Formata uma data e hora para exibição no formato brasileiro
 * 
 * @param dateString - String da data/hora
 * @returns String formatada como DD/MM/YYYY HH:MM
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
}

/**
 * Converte uma data para string no formato YYYY-MM-DD para inputs
 * 
 * @param date - Objeto Date
 * @returns String no formato YYYY-MM-DD
 */
export function dateToInputString(date: Date): string {
  // Ajusta para GMT-3 antes de converter
  const adjustedDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
}

/**
 * Obtém a data atual no fuso horário GMT-3
 * 
 * @returns Objeto Date ajustado para GMT-3
 */
export function getCurrentDateGMT3(): Date {
  const now = new Date();
  // Ajusta para GMT-3
  const gmt3Date = new Date(now.getTime() - (3 * 60 * 60 * 1000));
  return gmt3Date;
}

/**
 * Verifica se uma data está no passado, presente ou futuro (GMT-3)
 * 
 * @param dateString - String da data no formato YYYY-MM-DD
 * @returns 'past' | 'present' | 'future'
 */
export function getDateStatus(dateString: string): 'past' | 'present' | 'future' {
  const date = parseDate(dateString);
  const today = getCurrentDateGMT3();
  
  // Remove componente de tempo para comparação apenas de data
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  if (date < today) return 'past';
  if (date > today) return 'future';
  return 'present';
}

/**
 * Verifica se duas datas se sobrepõem
 * 
 * @param start1 - Data de início do primeiro período
 * @param end1 - Data de fim do primeiro período
 * @param start2 - Data de início do segundo período
 * @param end2 - Data de fim do segundo período
 * @returns true se há sobreposição
 */
export function datesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const startDate1 = parseDate(start1);
  const endDate1 = parseDate(end1);
  const startDate2 = parseDate(start2);
  const endDate2 = parseDate(end2);
  
  return startDate1 <= endDate2 && endDate1 >= startDate2;
}
/**
 * Interface para objetos que contêm datas de turma
 */
export interface TurmaDates {
  start_date: string;
  end_date: string;
}

/**
 * Verifica se uma turma está ativa em uma data específica
 * 
 * @param turma - Objeto com datas de início e fim
 * @param date - Data para verificar
 * @returns true se a turma está ativa na data
 */
export function isTurmaActiveOnDate(turma: TurmaDates, date: Date): boolean {
  const startDate = parseDate(turma.start_date);
  const endDate = parseDate(turma.end_date);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  
  return date >= startDate && date <= endDate;
}