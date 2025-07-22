import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Schema de validação para aluno
export const alunoSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z.string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  whatsapp: z.string()
    .min(10, 'WhatsApp deve ter pelo menos 10 dígitos')
    .max(15, 'WhatsApp deve ter no máximo 15 dígitos'),
  empresa: z.string()
    .max(100, 'Nome da empresa deve ter no máximo 100 caracteres')
    .optional()
    .or(z.literal('')),
  available_periods: z.array(z.enum(['manha', 'tarde', 'noite']))
    .optional()
    .default([])
});

// Schema de validação para professor
export const professorSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z.string()
    .email('Email inválido'),
  whatsapp: z.string()
    .min(10, 'WhatsApp deve ter pelo menos 10 dígitos')
    .max(15, 'WhatsApp deve ter no máximo 15 dígitos'),
  valor_hora: z.string()
    .transform(val => parseFloat(val))
    .refine(val => val > 0, 'Valor da hora deve ser maior que zero')
});

// Schema de validação para curso
export const cursoSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  carga_horaria: z.string()
    .transform(val => parseInt(val))
    .refine(val => val > 0, 'Carga horária deve ser maior que zero'),
  preco: z.string()
    .transform(val => parseFloat(val))
    .refine(val => val > 0, 'Preço deve ser maior que zero'),
  categoria_id: z.string()
    .optional()
    .or(z.literal(''))
});

// Schema de validação para sala
export const salaSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  cadeiras: z.string()
    .transform(val => parseInt(val))
    .refine(val => val > 0, 'Número de cadeiras deve ser maior que zero')
});

// Schema de validação para turma
export const turmaSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  curso_id: z.string()
    .min(1, 'Selecione um curso'),
  sala_id: z.string()
    .min(1, 'Selecione uma sala'),
  cadeiras: z.string()
    .transform(val => parseInt(val))
    .refine(val => val > 0, 'Número de vagas deve ser maior que zero'),
  period: z.enum(['manha', 'tarde', 'noite']),
  start_date: z.string()
    .min(1, 'Data de início é obrigatória'),
  end_date: z.string()
    .min(1, 'Data de término é obrigatória'),
  imposto: z.string()
    .transform(val => parseFloat(val))
    .refine(val => val >= 0 && val <= 100, 'Imposto deve estar entre 0 e 100%'),
  days_of_week: z.array(z.number())
    .min(1, 'Selecione pelo menos um dia da semana'),
  professores: z.array(z.object({
    professor_id: z.string().min(1, 'Selecione um professor'),
    hours: z.number().min(0.5, 'Mínimo 0.5 horas')
  })).optional().default([])
}).refine(data => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate > startDate;
}, {
  message: 'Data de término deve ser posterior à data de início',
  path: ['end_date']
});

export type AlunoFormData = z.infer<typeof alunoSchema>;
export type ProfessorFormData = z.infer<typeof professorSchema>;
export type CursoFormData = z.infer<typeof cursoSchema>;
export type SalaFormData = z.infer<typeof salaSchema>;
export type TurmaFormData = z.infer<typeof turmaSchema>;

/**
 * Hook para validação de formulários com React Hook Form + Zod
 */
export function useFormValidation<T extends z.ZodSchema>(
  schema: T,
  defaultValues?: Partial<z.infer<T>>
) {
  return useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange', // Validação em tempo real
  });
}