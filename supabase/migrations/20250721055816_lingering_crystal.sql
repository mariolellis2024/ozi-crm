/*
  # Implementação do Funil de Vendas

  1. Modificações na tabela aluno_curso_interests
    - Adicionar campo `sales_stage` para rastrear o estágio no funil
    - Adicionar campo `last_contact_date` para controle de follow-ups
    - Adicionar campo `notes` para observações da equipe de vendas
    - Adicionar campo `expected_close_date` para previsão de fechamento
    - Adicionar campo `lead_source` para origem do lead

  2. Nova tabela para histórico de interações
    - `lead_interactions` para registrar todas as interações com leads

  3. Atualizar políticas de segurança
*/

-- Adicionar enum para estágios do funil de vendas
CREATE TYPE sales_stage AS ENUM (
  'new_lead',           -- Novo lead (Topo do funil)
  'qualified',          -- Lead qualificado (Meio do funil)
  'proposal_sent',      -- Proposta enviada (Fundo do funil)
  'negotiation',        -- Em negociação (Fundo do funil)
  'enrolled',           -- Matriculado (Convertido)
  'lost'                -- Lead perdido
);

-- Adicionar enum para origem do lead
CREATE TYPE lead_source AS ENUM (
  'website',
  'social_media',
  'referral',
  'advertising',
  'event',
  'cold_outreach',
  'other'
);

-- Adicionar campos à tabela aluno_curso_interests
ALTER TABLE aluno_curso_interests 
ADD COLUMN IF NOT EXISTS sales_stage sales_stage DEFAULT 'new_lead',
ADD COLUMN IF NOT EXISTS last_contact_date timestamptz,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS expected_close_date date,
ADD COLUMN IF NOT EXISTS lead_source lead_source DEFAULT 'website',
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);

-- Criar tabela para histórico de interações
CREATE TABLE IF NOT EXISTS lead_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_id uuid REFERENCES aluno_curso_interests(id) ON DELETE CASCADE,
  interaction_type text NOT NULL, -- 'call', 'email', 'meeting', 'whatsapp', 'other'
  subject text,
  description text,
  interaction_date timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Atualizar registros existentes baseado no status atual
UPDATE aluno_curso_interests 
SET sales_stage = CASE 
  WHEN status = 'interested' THEN 'qualified'::sales_stage
  WHEN status = 'enrolled' THEN 'enrolled'::sales_stage
  WHEN status = 'completed' THEN 'enrolled'::sales_stage
  ELSE 'new_lead'::sales_stage
END
WHERE sales_stage IS NULL;

-- Habilitar RLS nas novas tabelas
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para lead_interactions
CREATE POLICY "Authenticated users can manage lead_interactions"
  ON lead_interactions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_aluno_curso_interests_sales_stage 
  ON aluno_curso_interests(sales_stage);

CREATE INDEX IF NOT EXISTS idx_aluno_curso_interests_last_contact 
  ON aluno_curso_interests(last_contact_date);

CREATE INDEX IF NOT EXISTS idx_lead_interactions_interest_id 
  ON lead_interactions(interest_id);

CREATE INDEX IF NOT EXISTS idx_lead_interactions_date 
  ON lead_interactions(interaction_date);