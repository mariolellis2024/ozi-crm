/*
  # Add turma_id to aluno_curso_interests table

  1. Changes
    - Add `turma_id` column to `aluno_curso_interests` table as foreign key to turmas
    - This column links students to specific classes they are interested in or enrolled in
  
  2. Column Details
    - `turma_id`: uuid, nullable, foreign key to turmas.id
  
  3. Purpose
    - Allows tracking which specific class a student is interested in or enrolled in
    - Enables conflict detection and class occupancy management
*/

-- Add turma_id column to aluno_curso_interests table
ALTER TABLE aluno_curso_interests 
ADD COLUMN IF NOT EXISTS turma_id uuid REFERENCES turmas(id) ON DELETE CASCADE;