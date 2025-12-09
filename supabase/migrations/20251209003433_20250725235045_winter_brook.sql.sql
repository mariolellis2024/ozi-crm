/*
  # Add missing columns for class scheduling

  1. Changes
    - Add `days_of_week` column to `turmas` table (array of integers representing days)
    - Add `available_periods` column to `alunos` table (array of period types)
  
  2. Column Details
    - `turmas.days_of_week`: integer array (1-7 where 1=Monday, 7=Sunday), nullable
    - `alunos.available_periods`: period_type array, nullable with default empty array
  
  3. Purpose
    - `days_of_week`: allows scheduling classes on specific days only
    - `available_periods`: allows filtering students by their available time periods
*/

-- Add days_of_week column to turmas table
ALTER TABLE turmas 
ADD COLUMN IF NOT EXISTS days_of_week integer[];

-- Add available_periods column to alunos table
ALTER TABLE alunos 
ADD COLUMN IF NOT EXISTS available_periods period_type[] DEFAULT ARRAY[]::period_type[];

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_turmas_days_of_week ON turmas USING GIN (days_of_week);
CREATE INDEX IF NOT EXISTS idx_alunos_available_periods ON alunos USING GIN (available_periods);