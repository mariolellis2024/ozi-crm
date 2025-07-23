/*
  # Índices de Performance para Otimização de Consultas

  Este arquivo cria índices estratégicos para melhorar significativamente a performance 
  das consultas mais frequentes do sistema Pepper Heads CRM.

  ## Índices Criados:

  ### 1. Tabela `alunos`
  - `idx_alunos_nome_search` - Busca por nome (case-insensitive)
  - `idx_alunos_email_search` - Busca por email (case-insensitive) 
  - `idx_alunos_whatsapp_search` - Busca por WhatsApp
  - `idx_alunos_created_at_desc` - Ordenação por data de criação (mais recentes primeiro)

  ### 2. Tabela `aluno_curso_interests`
  - `idx_interests_status_curso` - Filtros por status e curso (consultas de sugestões)
  - `idx_interests_aluno_status` - Filtros por aluno e status
  - `idx_interests_turma_status` - Filtros por turma e status
  - `idx_interests_last_contact` - Ordenação por última data de contato
  - `idx_interests_expected_close` - Filtros por data esperada de fechamento

  ### 3. Tabela `turmas`
  - `idx_turmas_period_dates` - Verificação de conflitos de horário
  - `idx_turmas_start_end_dates` - Consultas por período de datas
  - `idx_turmas_created_at_desc` - Ordenação por data de criação

  ### 4. Tabela `professores`
  - `idx_professores_nome_search` - Busca por nome (case-insensitive)
  - `idx_professores_created_at_desc` - Ordenação por data de criação

  ### 5. Tabela `cursos`
  - `idx_cursos_nome_search` - Busca por nome (case-insensitive)
  - `idx_cursos_preco_carga` - Consultas por preço e carga horária

  ### 6. Tabela `turma_professores`
  - `idx_turma_prof_hours` - Consultas por horas de trabalho

  ### 7. Tabela `lead_interactions`
  - `idx_interactions_date_type` - Filtros por data e tipo de interação

  ## Benefícios Esperados:
  - Consultas de busca 5-10x mais rápidas
  - Geração de sugestões de turmas otimizada
  - Verificação de conflitos de horário mais eficiente
  - Relatórios financeiros mais rápidos
  - Melhor performance em listas grandes
*/

-- =====================================================
-- ÍNDICES PARA TABELA `alunos`
-- =====================================================

-- Busca por nome (case-insensitive) - usado em filtros de busca
CREATE INDEX IF NOT EXISTS idx_alunos_nome_search 
ON public.alunos USING gin (to_tsvector('portuguese', nome));

-- Busca por email (case-insensitive) - usado em filtros de busca
CREATE INDEX IF NOT EXISTS idx_alunos_email_search 
ON public.alunos (lower(email)) 
WHERE email IS NOT NULL;

-- Busca por WhatsApp - usado em filtros de busca
CREATE INDEX IF NOT EXISTS idx_alunos_whatsapp_search 
ON public.alunos (whatsapp);

-- Ordenação por data de criação (mais recentes primeiro)
CREATE INDEX IF NOT EXISTS idx_alunos_created_at_desc 
ON public.alunos (created_at DESC);

-- Busca por empresa
CREATE INDEX IF NOT EXISTS idx_alunos_empresa 
ON public.alunos (empresa) 
WHERE empresa IS NOT NULL;

-- =====================================================
-- ÍNDICES PARA TABELA `aluno_curso_interests`
-- =====================================================

-- Consultas de sugestões de turmas (status + curso_id)
CREATE INDEX IF NOT EXISTS idx_interests_status_curso 
ON public.aluno_curso_interests (status, curso_id);

-- Consultas por aluno e status
CREATE INDEX IF NOT EXISTS idx_interests_aluno_status 
ON public.aluno_curso_interests (aluno_id, status);

-- Consultas por turma e status (alunos matriculados)
CREATE INDEX IF NOT EXISTS idx_interests_turma_status 
ON public.aluno_curso_interests (turma_id, status) 
WHERE turma_id IS NOT NULL;

-- Ordenação por última data de contato (CRM)
CREATE INDEX IF NOT EXISTS idx_interests_last_contact_desc 
ON public.aluno_curso_interests (last_contact_date DESC NULLS LAST);

-- Filtros por data esperada de fechamento
CREATE INDEX IF NOT EXISTS idx_interests_expected_close 
ON public.aluno_curso_interests (expected_close_date) 
WHERE expected_close_date IS NOT NULL;

-- Consultas por sales_stage (funil de vendas)
CREATE INDEX IF NOT EXISTS idx_interests_sales_stage 
ON public.aluno_curso_interests (sales_stage);

-- Consultas por lead_source (origem do lead)
CREATE INDEX IF NOT EXISTS idx_interests_lead_source 
ON public.aluno_curso_interests (lead_source);

-- Consultas por responsável
CREATE INDEX IF NOT EXISTS idx_interests_assigned_to 
ON public.aluno_curso_interests (assigned_to) 
WHERE assigned_to IS NOT NULL;

-- =====================================================
-- ÍNDICES PARA TABELA `turmas`
-- =====================================================

-- Verificação de conflitos de horário (período + datas)
CREATE INDEX IF NOT EXISTS idx_turmas_period_dates 
ON public.turmas (period, start_date, end_date);

-- Consultas por período de datas
CREATE INDEX IF NOT EXISTS idx_turmas_start_end_dates 
ON public.turmas (start_date, end_date);

-- Ordenação por data de criação
CREATE INDEX IF NOT EXISTS idx_turmas_created_at_desc 
ON public.turmas (created_at DESC);

-- Consultas por dias da semana
CREATE INDEX IF NOT EXISTS idx_turmas_days_of_week 
ON public.turmas USING gin (days_of_week);

-- =====================================================
-- ÍNDICES PARA TABELA `professores`
-- =====================================================

-- Busca por nome (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_professores_nome_search 
ON public.professores USING gin (to_tsvector('portuguese', nome));

-- Busca por email (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_professores_email_search 
ON public.professores (lower(email));

-- Ordenação por data de criação
CREATE INDEX IF NOT EXISTS idx_professores_created_at_desc 
ON public.professores (created_at DESC);

-- Consultas por valor da hora
CREATE INDEX IF NOT EXISTS idx_professores_valor_hora 
ON public.professores (valor_hora);

-- =====================================================
-- ÍNDICES PARA TABELA `cursos`
-- =====================================================

-- Busca por nome (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_cursos_nome_search 
ON public.cursos USING gin (to_tsvector('portuguese', nome));

-- Consultas por preço e carga horária (relatórios)
CREATE INDEX IF NOT EXISTS idx_cursos_preco_carga 
ON public.cursos (preco, carga_horaria);

-- Ordenação por data de criação
CREATE INDEX IF NOT EXISTS idx_cursos_created_at_desc 
ON public.cursos (created_at DESC);

-- =====================================================
-- ÍNDICES PARA TABELA `turma_professores`
-- =====================================================

-- Consultas por horas de trabalho (relatórios financeiros)
CREATE INDEX IF NOT EXISTS idx_turma_prof_hours 
ON public.turma_professores (professor_id, hours);

-- Consultas por turma e horas
CREATE INDEX IF NOT EXISTS idx_turma_prof_turma_hours 
ON public.turma_professores (turma_id, hours);

-- =====================================================
-- ÍNDICES PARA TABELA `salas`
-- =====================================================

-- Busca por nome
CREATE INDEX IF NOT EXISTS idx_salas_nome_search 
ON public.salas USING gin (to_tsvector('portuguese', nome));

-- Consultas por capacidade
CREATE INDEX IF NOT EXISTS idx_salas_cadeiras 
ON public.salas (cadeiras);

-- =====================================================
-- ÍNDICES PARA TABELA `categorias`
-- =====================================================

-- Busca por nome (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_categorias_nome_search 
ON public.categorias USING gin (to_tsvector('portuguese', nome));

-- =====================================================
-- ÍNDICES PARA TABELA `lead_interactions`
-- =====================================================

-- Filtros por data e tipo de interação
CREATE INDEX IF NOT EXISTS idx_interactions_date_type 
ON public.lead_interactions (interaction_date DESC, interaction_type);

-- Consultas por interesse
CREATE INDEX IF NOT EXISTS idx_interactions_interest_date 
ON public.lead_interactions (interest_id, interaction_date DESC);

-- Consultas por criador
CREATE INDEX IF NOT EXISTS idx_interactions_created_by 
ON public.lead_interactions (created_by, interaction_date DESC) 
WHERE created_by IS NOT NULL;

-- =====================================================
-- ÍNDICES COMPOSTOS PARA CONSULTAS COMPLEXAS
-- =====================================================

-- Para consultas de ocupação de salas (turmas + sala + período + datas)
CREATE INDEX IF NOT EXISTS idx_turmas_sala_period_dates 
ON public.turmas (sala_id, period, start_date, end_date) 
WHERE sala_id IS NOT NULL;

-- Para relatórios de faturamento (turmas + curso + datas)
CREATE INDEX IF NOT EXISTS idx_turmas_curso_dates 
ON public.turmas (curso_id, start_date, end_date);

-- Para consultas de alunos interessados por período
CREATE INDEX IF NOT EXISTS idx_interests_curso_status_created 
ON public.aluno_curso_interests (curso_id, status, created_at DESC);

-- =====================================================
-- ANÁLISE DE PERFORMANCE
-- =====================================================

-- Atualizar estatísticas das tabelas para o otimizador
ANALYZE public.alunos;
ANALYZE public.aluno_curso_interests;
ANALYZE public.turmas;
ANALYZE public.professores;
ANALYZE public.cursos;
ANALYZE public.turma_professores;
ANALYZE public.salas;
ANALYZE public.categorias;
ANALYZE public.lead_interactions;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON INDEX idx_alunos_nome_search IS 'Índice de busca textual para nomes de alunos usando português';
COMMENT ON INDEX idx_interests_status_curso IS 'Índice otimizado para geração de sugestões de turmas';
COMMENT ON INDEX idx_turmas_period_dates IS 'Índice para verificação rápida de conflitos de horário';
COMMENT ON INDEX idx_turmas_sala_period_dates IS 'Índice composto para consultas de ocupação de salas';