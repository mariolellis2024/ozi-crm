import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/dashboard/stats — aggregated KPIs
router.get('/stats', async (req, res) => {
  try {
    const { unidade_id } = req.query;
    
    // Build filter conditions
    const turmaFilter = unidade_id ? 'WHERE s.unidade_id = $1' : '';
    const alunoFilter = unidade_id ? 'WHERE a.unidade_id = $1' : '';
    const aciTurmaFilter = unidade_id ? 'AND s2.unidade_id = $1' : '';
    const params = unidade_id ? [unidade_id] : [];

    const [
      turmasResult,
      alunosResult,
      interestsResult,
      cursosResult,
      turmasDetailResult,
      recentActivityResult
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM turmas t LEFT JOIN salas s ON s.id = t.sala_id ${turmaFilter}`, params),
      pool.query(`SELECT COUNT(*) as total FROM alunos a ${alunoFilter}`, params),
      pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE aci.status = 'interested') as interested,
          COUNT(*) FILTER (WHERE aci.status = 'enrolled') as enrolled,
          COUNT(*) FILTER (WHERE aci.status = 'completed') as completed,
          COUNT(*) as total
        FROM aluno_curso_interests aci
        ${unidade_id ? 'JOIN alunos a ON a.id = aci.aluno_id WHERE a.unidade_id = $1' : ''}
      `, params),
      pool.query(`
        SELECT c.id, c.nome, c.preco,
          COUNT(DISTINCT aci.aluno_id) FILTER (WHERE aci.status = 'interested') as interested,
          COUNT(DISTINCT aci.aluno_id) FILTER (WHERE aci.status = 'enrolled') as enrolled
        FROM cursos c
        LEFT JOIN aluno_curso_interests aci ON aci.curso_id = c.id
        ${unidade_id ? 'LEFT JOIN alunos a ON a.id = aci.aluno_id' : ''}
        ${unidade_id ? 'WHERE (a.unidade_id = $1 OR aci.id IS NULL)' : ''}
        GROUP BY c.id, c.nome, c.preco
        ORDER BY interested DESC
        LIMIT 10
      `, params),
      pool.query(`
        SELECT t.id, t.name, t.cadeiras, t.period, t.start_date, t.end_date,
          c.nome as curso_nome, c.preco,
          COUNT(aci.id) FILTER (WHERE aci.status = 'enrolled') as enrolled_count,
          s.nome as sala_nome
        FROM turmas t
        JOIN cursos c ON c.id = t.curso_id
        LEFT JOIN salas s ON s.id = t.sala_id
        LEFT JOIN aluno_curso_interests aci ON aci.turma_id = t.id
        ${turmaFilter}
        GROUP BY t.id, t.name, t.cadeiras, t.period, t.start_date, t.end_date, c.nome, c.preco, s.nome
        ORDER BY t.start_date DESC
      `, params),
      pool.query(`
        SELECT * FROM activity_logs
        ORDER BY created_at DESC
        LIMIT 5
      `)
    ]);

    const interests = interestsResult.rows[0];
    const interested = parseInt(interests.interested);
    const enrolled = parseInt(interests.enrolled);
    const totalInterests = parseInt(interests.total);
    const conversionRate = totalInterests > 0 ? ((enrolled / totalInterests) * 100).toFixed(1) : 0;

    // Calculate real revenue
    const turmasDetail = turmasDetailResult.rows;
    const faturamentoRealizado = turmasDetail.reduce((sum, t) => {
      return sum + (parseInt(t.enrolled_count) * parseFloat(t.preco));
    }, 0);
    const faturamentoPotencial = turmasDetail.reduce((sum, t) => {
      return sum + (parseInt(t.cadeiras) * parseFloat(t.preco));
    }, 0);

    // Occupation
    const totalCadeiras = turmasDetail.reduce((sum, t) => sum + parseInt(t.cadeiras), 0);
    const totalEnrolled = turmasDetail.reduce((sum, t) => sum + parseInt(t.enrolled_count), 0);
    const ocupacaoMedia = totalCadeiras > 0 ? ((totalEnrolled / totalCadeiras) * 100).toFixed(1) : 0;

    // Turmas with openings
    const turmasComVagas = turmasDetail
      .filter(t => parseInt(t.enrolled_count) < parseInt(t.cadeiras))
      .map(t => ({
        id: t.id,
        name: t.name,
        curso: t.curso_nome,
        sala: t.sala_nome,
        period: t.period,
        enrolled: parseInt(t.enrolled_count),
        cadeiras: parseInt(t.cadeiras),
        start_date: t.start_date,
        end_date: t.end_date
      }));

    res.json({
      totalTurmas: parseInt(turmasResult.rows[0].total),
      totalAlunos: parseInt(alunosResult.rows[0].total),
      interested,
      enrolled,
      completed: parseInt(interests.completed),
      conversionRate: parseFloat(conversionRate),
      faturamentoRealizado,
      faturamentoPotencial,
      ocupacaoMedia: parseFloat(ocupacaoMedia),
      topCursos: cursosResult.rows.map(c => ({
        id: c.id,
        nome: c.nome,
        preco: parseFloat(c.preco),
        interested: parseInt(c.interested),
        enrolled: parseInt(c.enrolled)
      })),
      turmasComVagas,
      recentActivity: recentActivityResult.rows
    });
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    res.status(500).json({ error: 'Erro ao carregar estatísticas' });
  }
});

export default router;
