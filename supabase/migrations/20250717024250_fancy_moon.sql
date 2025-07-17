/*
  # Add available periods to alunos table

  1. Changes
    - Add `available_periods` column to `alunos` table
    - Column type: array of period_type enum values
    - Default value: empty array
    - Allow null values for backward compatibility

  2. Security
    - No changes to RLS policies needed
    - Existing policies will cover the new column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alunos' AND column_name = 'available_periods'
  ) THEN
    ALTER TABLE alunos ADD COLUMN available_periods period_type[] DEFAULT '{}';
  END IF;
END $$;