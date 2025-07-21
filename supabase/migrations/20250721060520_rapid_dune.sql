/*
  # Automação para marcar alunos como concluídos

  1. Nova Função
    - `mark_students_as_completed()` - Marca alunos matriculados como concluídos em turmas finalizadas
    - `check_and_complete_students()` - Função wrapper para ser chamada via trigger ou manualmente

  2. Trigger Automático
    - Executa a verificação sempre que uma turma é atualizada
    - Verifica se a data de fim passou e marca alunos como concluídos

  3. Índices de Performance
    - Otimiza as consultas para turmas finalizadas
    - Melhora performance das verificações automáticas
*/

-- Função principal para marcar alunos como concluídos
CREATE OR REPLACE FUNCTION public.mark_students_as_completed()
RETURNS TABLE(
  updated_count integer,
  turmas_finalizadas text[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  turma_record RECORD;
  total_updated integer := 0;
  turmas_list text[] := '{}';
  students_updated integer;
BEGIN
  -- Loop através de todas as turmas que já finalizaram
  FOR turma_record IN 
    SELECT t.id, t.name, t.end_date
    FROM public.turmas t
    WHERE t.end_date < CURRENT_DATE
  LOOP
    -- Atualiza alunos matriculados para concluído nesta turma específica
    UPDATE public.aluno_curso_interests
    SET status = 'completed'
    WHERE status = 'enrolled' 
      AND turma_id = turma_record.id;
    
    -- Conta quantos registros foram atualizados
    GET DIAGNOSTICS students_updated = ROW_COUNT;
    
    -- Se houve atualizações, adiciona à lista de turmas processadas
    IF students_updated > 0 THEN
      total_updated := total_updated + students_updated;
      turmas_list := array_append(turmas_list, turma_record.name || ' (' || students_updated || ' alunos)');
    END IF;
  END LOOP;
  
  -- Retorna o resultado
  RETURN QUERY SELECT total_updated, turmas_list;
END;
$$;

-- Função wrapper para ser usada em triggers
CREATE OR REPLACE FUNCTION public.check_and_complete_students()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  result_record RECORD;
BEGIN
  -- Só executa se a data de fim foi alterada ou se é uma nova turma
  IF TG_OP = 'UPDATE' AND (OLD.end_date IS DISTINCT FROM NEW.end_date) THEN
    -- Se a nova data de fim é anterior a hoje, marca alunos como concluídos
    IF NEW.end_date < CURRENT_DATE THEN
      UPDATE public.aluno_curso_interests
      SET status = 'completed'
      WHERE status = 'enrolled' 
        AND turma_id = NEW.id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger para executar automaticamente quando uma turma é atualizada
DROP TRIGGER IF EXISTS trigger_auto_complete_students ON public.turmas;
CREATE TRIGGER trigger_auto_complete_students
  AFTER UPDATE ON public.turmas
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_complete_students();

-- Índice para otimizar consultas de turmas finalizadas
CREATE INDEX IF NOT EXISTS idx_turmas_end_date_status 
ON public.turmas(end_date) 
WHERE end_date < CURRENT_DATE;

-- Índice para otimizar consultas de alunos matriculados
CREATE INDEX IF NOT EXISTS idx_aluno_curso_interests_enrolled_turma 
ON public.aluno_curso_interests(turma_id, status) 
WHERE status = 'enrolled';

-- Executa a função uma vez para processar turmas já finalizadas
SELECT * FROM public.mark_students_as_completed();