/*
  # Remover registros de alunos cursando e concluídos

  1. Operações
     - Remove todos os registros com status 'enrolled' (cursando)
     - Remove todos os registros com status 'completed' (concluído)
     - Mantém apenas registros com status 'interested' (interessado)

  2. Impacto
     - Limpa dados de matrículas e conclusões
     - Preserva dados de interesse dos alunos
     - Não afeta outras tabelas (alunos, cursos, turmas permanecem intactos)

  3. Segurança
     - Operação irreversível - dados de matrícula serão perdidos
     - Backup recomendado antes da execução
*/

-- Remover todos os registros de alunos cursando (enrolled)
DELETE FROM aluno_curso_interests 
WHERE status = 'enrolled';

-- Remover todos os registros de alunos que concluíram (completed)
DELETE FROM aluno_curso_interests 
WHERE status = 'completed';

-- Verificar resultado da limpeza
-- Esta query mostrará apenas registros com status 'interested'
-- SELECT status, COUNT(*) as total 
-- FROM aluno_curso_interests 
-- GROUP BY status;