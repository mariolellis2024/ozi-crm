/*
  # Add Course Categories System

  1. New Tables
    - `categorias`
      - `id` (uuid, primary key)
      - `nome` (text, unique)
      - `created_at` (timestamp)

  2. Changes
    - Add `categoria_id` to `cursos` table
    - Add foreign key relationship

  3. Security
    - Enable RLS on `categorias` table
    - Add policy for authenticated users to manage categories
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

-- Add policy for authenticated users
CREATE POLICY "Authenticated users can manage categorias"
  ON categorias
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add categoria_id to cursos table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cursos' AND column_name = 'categoria_id'
  ) THEN
    ALTER TABLE cursos ADD COLUMN categoria_id uuid REFERENCES categorias(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cursos_categoria_id ON cursos(categoria_id);