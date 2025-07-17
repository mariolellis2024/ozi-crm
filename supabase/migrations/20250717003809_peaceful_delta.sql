/*
  # Create initial database schema for Pepper Heads

  1. New Tables
    - `professores`
      - `id` (uuid, primary key)
      - `nome` (text)
      - `email` (text, unique)
      - `whatsapp` (text)
      - `valor_hora` (numeric)
      - `created_at` (timestamp)
    
    - `cursos`
      - `id` (uuid, primary key)
      - `nome` (text)
      - `carga_horaria` (integer)
      - `preco` (numeric)
      - `created_at` (timestamp)
    
    - `salas`
      - `id` (uuid, primary key)
      - `nome` (text)
      - `cadeiras` (integer)
      - `created_at` (timestamp)
    
    - `alunos`
      - `id` (uuid, primary key)
      - `nome` (text)
      - `email` (text)
      - `whatsapp` (text)
      - `empresa` (text, optional)
      - `created_at` (timestamp)
    
    - `aluno_curso_interests`
      - `id` (uuid, primary key)
      - `aluno_id` (uuid, foreign key)
      - `curso_id` (uuid, foreign key)
      - `status` (enum: interested, enrolled, completed)
      - `created_at` (timestamp)
    
    - `turmas`
      - `id` (uuid, primary key)
      - `name` (text)
      - `curso_id` (uuid, foreign key)
      - `sala_id` (uuid, foreign key)
      - `cadeiras` (integer)
      - `potencial_faturamento` (numeric)
      - `period` (enum: manha, tarde, noite)
      - `start_date` (date)
      - `end_date` (date)
      - `imposto` (numeric)
      - `created_at` (timestamp)
    
    - `turma_professores`
      - `id` (uuid, primary key)
      - `turma_id` (uuid, foreign key)
      - `professor_id` (uuid, foreign key)
      - `hours` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
*/

-- Create custom types
CREATE TYPE period_type AS ENUM ('manha', 'tarde', 'noite');
CREATE TYPE interest_status AS ENUM ('interested', 'enrolled', 'completed');

-- Create professores table
CREATE TABLE IF NOT EXISTS professores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text UNIQUE NOT NULL,
  whatsapp text NOT NULL,
  valor_hora numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create cursos table
CREATE TABLE IF NOT EXISTS cursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  carga_horaria integer NOT NULL DEFAULT 0,
  preco numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create salas table
CREATE TABLE IF NOT EXISTS salas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cadeiras integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Create alunos table
CREATE TABLE IF NOT EXISTS alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text,
  whatsapp text NOT NULL,
  empresa text,
  created_at timestamptz DEFAULT now()
);

-- Create aluno_curso_interests table
CREATE TABLE IF NOT EXISTS aluno_curso_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid REFERENCES alunos(id) ON DELETE CASCADE,
  curso_id uuid REFERENCES cursos(id) ON DELETE CASCADE,
  status interest_status NOT NULL DEFAULT 'interested',
  created_at timestamptz DEFAULT now(),
  UNIQUE(aluno_id, curso_id)
);

-- Create turmas table
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
  created_at timestamptz DEFAULT now()
);

-- Create turma_professores table
CREATE TABLE IF NOT EXISTS turma_professores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid REFERENCES turmas(id) ON DELETE CASCADE,
  professor_id uuid REFERENCES professores(id) ON DELETE CASCADE,
  hours integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(turma_id, professor_id)
);

-- Enable Row Level Security
ALTER TABLE professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE aluno_curso_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE turma_professores ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can manage professores"
  ON professores
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage cursos"
  ON cursos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage salas"
  ON salas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage alunos"
  ON alunos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage aluno_curso_interests"
  ON aluno_curso_interests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage turmas"
  ON turmas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage turma_professores"
  ON turma_professores
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_aluno_curso_interests_aluno_id ON aluno_curso_interests(aluno_id);
CREATE INDEX IF NOT EXISTS idx_aluno_curso_interests_curso_id ON aluno_curso_interests(curso_id);
CREATE INDEX IF NOT EXISTS idx_turmas_curso_id ON turmas(curso_id);
CREATE INDEX IF NOT EXISTS idx_turmas_sala_id ON turmas(sala_id);
CREATE INDEX IF NOT EXISTS idx_turma_professores_turma_id ON turma_professores(turma_id);
CREATE INDEX IF NOT EXISTS idx_turma_professores_professor_id ON turma_professores(professor_id);