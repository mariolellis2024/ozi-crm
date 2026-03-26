-- =====================================================
-- OZI CRM - Database Initialization Script
-- Consolidated from Supabase migrations
-- =====================================================

-- Create custom types
-- Create custom types (idempotent)
DO $$ BEGIN
  CREATE TYPE period_type AS ENUM ('manha', 'tarde', 'noite');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE interest_status AS ENUM ('interested', 'enrolled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- Users table (replaces Supabase auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text,
  is_blocked boolean DEFAULT false,
  is_super_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add columns if they don't exist (for existing databases)
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;
END $$;

-- Set mario@ozi.com.br as super admin
UPDATE users SET is_super_admin = true WHERE email = 'mario@ozi.com.br';

-- =====================================================
-- Core tables
-- =====================================================

CREATE TABLE IF NOT EXISTS professores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text UNIQUE NOT NULL,
  whatsapp text NOT NULL,
  valor_hora numeric NOT NULL DEFAULT 0,
  unidade_id uuid REFERENCES unidades(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  carga_horaria integer NOT NULL DEFAULT 0,
  preco numeric NOT NULL DEFAULT 0,
  categoria_id uuid REFERENCES categorias(id) ON DELETE SET NULL,
  imagem_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cidade text,
  endereco text,
  meta_pixel_id text,
  meta_capi_token text,
  google_analytics_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS formularios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  curso_id uuid NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  unidade_id uuid NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  titulo text,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unidade_id uuid NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  UNIQUE(user_id, unidade_id)
);

CREATE TABLE IF NOT EXISTS salas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cadeiras integer NOT NULL DEFAULT 1,
  unidade_id uuid REFERENCES unidades(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text,
  whatsapp text NOT NULL,
  empresa text,
  available_periods period_type[] DEFAULT ARRAY[]::period_type[],
  unidade_id uuid REFERENCES unidades(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  curso_id uuid REFERENCES cursos(id) ON DELETE CASCADE,
  sala_id uuid REFERENCES salas(id) ON DELETE RESTRICT,
  cadeiras integer NOT NULL DEFAULT 1,
  potencial_faturamento numeric NOT NULL DEFAULT 0,
  period period_type NOT NULL DEFAULT 'manha',
  start_date date NOT NULL,
  end_date date NOT NULL,
  imposto numeric NOT NULL DEFAULT 0,
  investimento_anuncios numeric NOT NULL DEFAULT 0,
  days_of_week integer[],
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS turma_professores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid REFERENCES turmas(id) ON DELETE CASCADE,
  professor_id uuid REFERENCES professores(id) ON DELETE CASCADE,
  hours integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(turma_id, professor_id)
);

CREATE TABLE IF NOT EXISTS aluno_curso_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid REFERENCES alunos(id) ON DELETE CASCADE,
  curso_id uuid REFERENCES cursos(id) ON DELETE CASCADE,
  status interest_status NOT NULL DEFAULT 'interested',
  turma_id uuid REFERENCES turmas(id) ON DELETE CASCADE,
  sales_stage text DEFAULT 'new_lead',
  last_contact_date timestamptz,
  notes text,
  expected_close_date date,
  lead_source text DEFAULT 'website',
  created_at timestamptz DEFAULT now(),
  UNIQUE(aluno_id, curso_id)
);

CREATE TABLE IF NOT EXISTS lead_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_id uuid REFERENCES aluno_curso_interests(id) ON DELETE CASCADE,
  interaction_type text NOT NULL,
  subject text,
  description text,
  interaction_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- Indexes
-- =====================================================

-- Alunos
CREATE INDEX IF NOT EXISTS idx_alunos_created_at_desc ON alunos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alunos_whatsapp_search ON alunos (whatsapp);
CREATE INDEX IF NOT EXISTS idx_alunos_available_periods ON alunos USING GIN (available_periods);

-- Aluno Curso Interests
CREATE INDEX IF NOT EXISTS idx_aluno_curso_interests_aluno_id ON aluno_curso_interests(aluno_id);
CREATE INDEX IF NOT EXISTS idx_aluno_curso_interests_curso_id ON aluno_curso_interests(curso_id);
CREATE INDEX IF NOT EXISTS idx_interests_status_curso ON aluno_curso_interests (status, curso_id);
CREATE INDEX IF NOT EXISTS idx_interests_aluno_status ON aluno_curso_interests (aluno_id, status);
CREATE INDEX IF NOT EXISTS idx_interests_turma_status ON aluno_curso_interests (turma_id, status) WHERE turma_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interests_curso_status_created ON aluno_curso_interests (curso_id, status, created_at DESC);

-- Turmas
CREATE INDEX IF NOT EXISTS idx_turmas_curso_id ON turmas(curso_id);
CREATE INDEX IF NOT EXISTS idx_turmas_sala_id ON turmas(sala_id);
CREATE INDEX IF NOT EXISTS idx_turmas_period_dates ON turmas (period, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_turmas_created_at_desc ON turmas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_turmas_days_of_week ON turmas USING GIN (days_of_week);
CREATE INDEX IF NOT EXISTS idx_turmas_sala_period_dates ON turmas (sala_id, period, start_date, end_date) WHERE sala_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_turmas_curso_dates ON turmas (curso_id, start_date, end_date);

-- Turma Professores
CREATE INDEX IF NOT EXISTS idx_turma_professores_turma_id ON turma_professores(turma_id);
CREATE INDEX IF NOT EXISTS idx_turma_professores_professor_id ON turma_professores(professor_id);
CREATE INDEX IF NOT EXISTS idx_turma_prof_hours ON turma_professores (professor_id, hours);

-- Cursos
CREATE INDEX IF NOT EXISTS idx_cursos_categoria_id ON cursos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_cursos_created_at_desc ON cursos (created_at DESC);

-- Salas
CREATE INDEX IF NOT EXISTS idx_salas_cadeiras ON salas (cadeiras);

-- Professores
CREATE INDEX IF NOT EXISTS idx_professores_created_at_desc ON professores (created_at DESC);

-- Lead Interactions
CREATE INDEX IF NOT EXISTS idx_interactions_interest_id ON lead_interactions(interest_id);
CREATE INDEX IF NOT EXISTS idx_interactions_date_type ON lead_interactions (interaction_date DESC, interaction_type);

-- =====================================================
-- Activity Log (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);

-- =====================================================
-- Payments (Pagamentos / Parcelas)
-- =====================================================
CREATE TABLE IF NOT EXISTS pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  curso_id uuid NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  turma_id uuid REFERENCES turmas(id) ON DELETE SET NULL,
  parcela integer NOT NULL DEFAULT 1,
  total_parcelas integer NOT NULL DEFAULT 1,
  valor numeric NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  due_date date NOT NULL,
  paid_date date,
  payment_method text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_aluno ON pagamentos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_due_date ON pagamentos(due_date);

-- =====================================================
-- Functions
-- =====================================================

CREATE OR REPLACE FUNCTION mark_students_as_completed()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count integer := 0;
BEGIN
    UPDATE aluno_curso_interests
    SET status = 'completed'
    WHERE status = 'enrolled'
    AND turma_id IN (
        SELECT id
        FROM turmas
        WHERE end_date < CURRENT_DATE
    );
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;
