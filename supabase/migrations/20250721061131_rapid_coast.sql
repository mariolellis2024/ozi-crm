/*
  # Create function to mark students as completed

  1. New Functions
    - `mark_students_as_completed()` - Marks students as completed for finished classes
  
  2. Logic
    - Finds all classes where end_date < current date
    - Updates student interests from 'enrolled' to 'completed' for those classes
    - Returns count of updated records
  
  3. Security
    - Function is accessible to authenticated users
    - Uses existing RLS policies on tables
*/

CREATE OR REPLACE FUNCTION public.mark_students_as_completed()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count integer := 0;
BEGIN
    -- Update student interests status from 'enrolled' to 'completed'
    -- for classes that have already finished (end_date < current date)
    UPDATE public.aluno_curso_interests
    SET status = 'completed'
    WHERE status = 'enrolled'
    AND turma_id IN (
        SELECT id
        FROM public.turmas
        WHERE end_date < CURRENT_DATE
    );
    
    -- Get the count of updated records
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Return the number of students marked as completed
    RETURN updated_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_students_as_completed() TO authenticated;