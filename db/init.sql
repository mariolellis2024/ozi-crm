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
-- Core tables (order matters for foreign keys)
-- =====================================================

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

CREATE TABLE IF NOT EXISTS categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS professores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text UNIQUE NOT NULL,
  whatsapp text NOT NULL,
  valor_hora numeric NOT NULL DEFAULT 0,
  unidade_id uuid REFERENCES unidades(id) ON DELETE SET NULL,
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

-- Meta tracking columns for CAPI Purchase events (added after initial schema)
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS meta_fbc text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS meta_fbp text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS meta_client_ip text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS meta_user_agent text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS genero text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS data_nascimento date;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cep text;

-- Contract-specific aluno fields
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS rg text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cidade text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS uf text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS profissao text;

-- Contract-specific turma fields
ALTER TABLE turmas ADD COLUMN IF NOT EXISTS horario_inicio text;
ALTER TABLE turmas ADD COLUMN IF NOT EXISTS horario_fim text;
ALTER TABLE turmas ADD COLUMN IF NOT EXISTS local_aula text;
ALTER TABLE turmas ADD COLUMN IF NOT EXISTS endereco_aula text;
ALTER TABLE turmas ADD COLUMN IF NOT EXISTS carga_horaria_total integer;
ALTER TABLE turmas ADD COLUMN IF NOT EXISTS acompanhamento_inicio date;
ALTER TABLE turmas ADD COLUMN IF NOT EXISTS acompanhamento_fim date;
ALTER TABLE turmas ADD COLUMN IF NOT EXISTS sessoes_online text;

-- Contract: curso description + modules
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS modulos text[];

-- Contract: legal jurisdiction (comarca)
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS comarca text;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS estado_comarca text;
-- =====================================================
-- Form Analytics (visits + formulario_id on interests)
-- =====================================================
CREATE TABLE IF NOT EXISTS form_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id uuid NOT NULL REFERENCES formularios(id) ON DELETE CASCADE,
  visitor_ip text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_visits_formulario ON form_visits(formulario_id);

ALTER TABLE aluno_curso_interests ADD COLUMN IF NOT EXISTS formulario_id uuid REFERENCES formularios(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_interests_formulario ON aluno_curso_interests(formulario_id) WHERE formulario_id IS NOT NULL;

-- =====================================================
-- Investimento em Ads: previsto (existing) + realizado (new)
-- The existing column investimento_anuncios stores the planned/previsto budget.
-- We add a new column for actual/realizado spend.
-- =====================================================
ALTER TABLE turmas ADD COLUMN IF NOT EXISTS investimento_anuncios_realizado NUMERIC(10,2) NOT NULL DEFAULT 0;

-- =====================================================
-- Track which user closed each enrollment (for sales/commission tracking)
-- =====================================================
ALTER TABLE aluno_curso_interests ADD COLUMN IF NOT EXISTS enrolled_by uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_interests_enrolled_by ON aluno_curso_interests(enrolled_by) WHERE enrolled_by IS NOT NULL;

-- =====================================================
-- Capacity planning on unidades: hours/day per room + price per student/hour
-- =====================================================
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS horas_disponiveis_dia NUMERIC(4,1) NOT NULL DEFAULT 0;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS valor_hora_aluno NUMERIC(10,2) NOT NULL DEFAULT 0;

-- =====================================================
-- Add 'lost' status to interest_status enum
-- =====================================================
DO $$ BEGIN
  ALTER TYPE interest_status ADD VALUE IF NOT EXISTS 'lost';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- Contact history — track interactions with students
-- =====================================================
CREATE TABLE IF NOT EXISTS contact_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'contato',
  descricao TEXT NOT NULL,
  motivo_perda VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_history_aluno ON contact_history(aluno_id);

-- =====================================================
-- Fix legacy gender values ('m' -> 'masculino', 'f' -> 'feminino')
-- =====================================================
UPDATE alunos SET genero = 'masculino' WHERE genero = 'm';
UPDATE alunos SET genero = 'feminino' WHERE genero = 'f';
UPDATE alunos SET genero = 'masculino' WHERE genero = 'M';
UPDATE alunos SET genero = 'feminino' WHERE genero = 'F';

-- =====================================================
-- Social Proof Groups — collections of alumni/testimonials
-- =====================================================
CREATE TABLE IF NOT EXISTS social_proof_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_proof_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES social_proof_groups(id) ON DELETE CASCADE,
  nome text NOT NULL,
  foto_url text,
  metricas jsonb DEFAULT '[]',
  total_seguidores text,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Link formulario to a social proof group
ALTER TABLE formularios ADD COLUMN IF NOT EXISTS social_proof_group_id uuid REFERENCES social_proof_groups(id) ON DELETE SET NULL;


-- =====================================================
-- Curso Módulos — course content/modules for landing pages
-- =====================================================
CREATE TABLE IF NOT EXISTS curso_modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id uuid NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  duracao_horas numeric DEFAULT 0,
  icone text DEFAULT '📚',
  entrega text,
  semana text,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_curso_modulos_curso ON curso_modulos(curso_id);

-- =====================================================
-- Landing Pages — full-featured capture pages
-- =====================================================
CREATE TABLE IF NOT EXISTS landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  curso_id uuid NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  unidade_id uuid NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  ativo boolean DEFAULT true,

  -- Hero section
  hero_headline text,
  hero_subheadline text,
  hero_image_url text,

  -- "Para quem" section
  para_quem_headline text,
  para_quem_texto text,
  sem_curso_items jsonb DEFAULT '[]',
  com_curso_items jsonb DEFAULT '[]',

  -- Bônus section
  bonus_titulo text,
  bonus_descricao text,
  bonus_entrega text,
  bonus_image_url text,

  -- Investimento section
  investimento_headline text,
  investimento_descricao text,
  preco_parcelas integer DEFAULT 12,
  preco_valor_parcela numeric,
  preco_desconto text,
  investimento_items jsonb DEFAULT '[]',

  -- Social Proof section
  social_proof_headline1 text,
  social_proof_headline2 text,
  social_proof_group_id uuid REFERENCES social_proof_groups(id) ON DELETE SET NULL,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_curso ON landing_pages(curso_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_unidade ON landing_pages(unidade_id);

-- Landing page visit analytics
CREATE TABLE IF NOT EXISTS landing_page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id uuid NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  visitor_ip text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lp_visits_lp ON landing_page_visits(landing_page_id);

-- Track which landing page generated the interest
ALTER TABLE aluno_curso_interests ADD COLUMN IF NOT EXISTS landing_page_id uuid REFERENCES landing_pages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_interests_landing_page ON aluno_curso_interests(landing_page_id) WHERE landing_page_id IS NOT NULL;

-- =====================================================
-- Professor Payments
-- =====================================================
CREATE TABLE IF NOT EXISTS professor_pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_professor_id uuid NOT NULL REFERENCES turma_professores(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
  turma_id uuid NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  parcela integer NOT NULL DEFAULT 1,
  valor numeric(10,2) NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  paid_date date,
  recibo_url text,
  nota_fiscal_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prof_pag_professor ON professor_pagamentos(professor_id);
CREATE INDEX IF NOT EXISTS idx_prof_pag_turma ON professor_pagamentos(turma_id);
CREATE INDEX IF NOT EXISTS idx_prof_pag_status ON professor_pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_prof_pag_due_date ON professor_pagamentos(due_date);

-- =====================================================
-- Contratos (ZapSign Integration)
-- =====================================================
CREATE TABLE IF NOT EXISTS contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_id uuid REFERENCES aluno_curso_interests(id) ON DELETE SET NULL,
  aluno_id uuid NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  turma_id uuid REFERENCES turmas(id) ON DELETE SET NULL,
  zapsign_doc_token text,
  zapsign_signer_token text,
  sign_url text,
  status text NOT NULL DEFAULT 'pending',
  signed_at timestamptz,
  original_file_url text,
  signed_file_url text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contratos_aluno ON contratos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_contratos_turma ON contratos(turma_id);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos(status);
CREATE INDEX IF NOT EXISTS idx_contratos_doc_token ON contratos(zapsign_doc_token);

-- =====================================================
-- UTM Tracking — track ad campaign origin per interest
-- =====================================================
ALTER TABLE aluno_curso_interests ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE aluno_curso_interests ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE aluno_curso_interests ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE aluno_curso_interests ADD COLUMN IF NOT EXISTS utm_content text;
ALTER TABLE aluno_curso_interests ADD COLUMN IF NOT EXISTS utm_term text;

CREATE INDEX IF NOT EXISTS idx_interests_utm_campaign ON aluno_curso_interests(utm_campaign) WHERE utm_campaign IS NOT NULL;

-- =====================================================
-- Facebook Instant Forms — lead deduplication
-- =====================================================
ALTER TABLE aluno_curso_interests ADD COLUMN IF NOT EXISTS fb_lead_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_interests_fb_lead ON aluno_curso_interests(fb_lead_id) WHERE fb_lead_id IS NOT NULL;

-- =====================================================
-- Leads capturados por turma (para cálculo de CPL)
-- =====================================================
ALTER TABLE turmas ADD COLUMN IF NOT EXISTS leads_capturados INTEGER NOT NULL DEFAULT 0;

-- =====================================================
-- Tipo de sala: 'sala' (própria) ou 'auditorio' (alugado)
-- Auditórios não entram nos cálculos de potencial da unidade
-- =====================================================
ALTER TABLE salas ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'sala';

-- =====================================================
-- Período "Dia Inteiro" (manhã + tarde = 6h/dia)
-- =====================================================
DO $$ BEGIN
  ALTER TYPE period_type ADD VALUE IF NOT EXISTS 'dia_inteiro';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- Facebook Import Connections — saved spreadsheet links for auto-sync
-- =====================================================
CREATE TABLE IF NOT EXISTS fb_import_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  spreadsheet_url text NOT NULL,
  curso_id uuid NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  unidade_id uuid NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  ativo boolean DEFAULT true,
  last_sync_at timestamptz,
  last_sync_count integer DEFAULT 0,
  last_sync_error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fb_import_connections_ativo ON fb_import_connections(ativo) WHERE ativo = true;

-- =====================================================
-- Add 'in_service' status to interest_status enum (Em atendimento)
-- =====================================================
DO $$ BEGIN
  ALTER TYPE interest_status ADD VALUE IF NOT EXISTS 'in_service';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

