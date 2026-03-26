import { Router } from 'express';
import pool, { parsePgArray } from '../db.js';
import { logActivity } from '../activityLog.js';

const router = Router();

// GET /api/turmas
router.get('/', async (req, res) => {
  try {
    const turmasResult = await pool.query(
      `SELECT t.id, t.name, t.curso_id, t.sala_id, t.cadeiras, t.potencial_faturamento,
              t.period, t.start_date, t.end_date, t.imposto, t.investimento_anuncios, t.days_of_week, t.created_at,
              c.id as c_id, c.nome as c_nome, c.preco as c_preco, c.carga_horaria as c_carga_horaria,
              s.id as s_id, s.nome as s_nome, s.cadeiras as s_cadeiras
       FROM turmas t
       LEFT JOIN cursos c ON c.id = t.curso_id
       LEFT JOIN salas s ON s.id = t.sala_id
       ORDER BY t.created_at DESC`
    );

    // Load professors for all turmas
    const profResult = await pool.query(
      `SELECT tp.id, tp.turma_id, tp.professor_id, tp.hours,
              p.id as p_id, p.nome as p_nome, p.valor_hora as p_valor_hora
       FROM turma_professores tp
       LEFT JOIN professores p ON p.id = tp.professor_id`
    );

    const profByTurma = {};
    profResult.rows.forEach(row => {
      if (!profByTurma[row.turma_id]) profByTurma[row.turma_id] = [];
      profByTurma[row.turma_id].push({
        id: row.id,
        professor_id: row.professor_id,
        hours: row.hours,
        professor: { id: row.p_id, nome: row.p_nome, valor_hora: parseFloat(row.p_valor_hora) }
      });
    });

    // Load enrolled students for all turmas
    const enrolledResult = await pool.query(
      `SELECT aci.turma_id, a.id, a.nome
       FROM aluno_curso_interests aci
       INNER JOIN alunos a ON a.id = aci.aluno_id
       WHERE aci.status = 'enrolled' AND aci.turma_id IS NOT NULL`
    );

    const enrolledByTurma = {};
    enrolledResult.rows.forEach(row => {
      if (!enrolledByTurma[row.turma_id]) enrolledByTurma[row.turma_id] = [];
      enrolledByTurma[row.turma_id].push({ id: row.id, nome: row.nome });
    });

    const turmas = turmasResult.rows.map(t => ({
      id: t.id,
      name: t.name,
      curso_id: t.curso_id,
      sala_id: t.sala_id,
      cadeiras: t.cadeiras,
      potencial_faturamento: parseFloat(t.potencial_faturamento),
      period: t.period,
      start_date: t.start_date instanceof Date ? t.start_date.toISOString().split('T')[0] : t.start_date,
      end_date: t.end_date instanceof Date ? t.end_date.toISOString().split('T')[0] : t.end_date,
      imposto: parseFloat(t.imposto),
      investimento_anuncios: parseFloat(t.investimento_anuncios),
      days_of_week: parsePgArray(t.days_of_week),
      created_at: t.created_at,
      curso: t.c_id ? { id: t.c_id, nome: t.c_nome, preco: parseFloat(t.c_preco), carga_horaria: t.c_carga_horaria } : null,
      sala: t.s_id ? { id: t.s_id, nome: t.s_nome, cadeiras: t.s_cadeiras } : null,
      professores: profByTurma[t.id] || [],
      alunos_enrolled: enrolledByTurma[t.id] || []
    }));

    res.json(turmas);
  } catch (error) {
    console.error('Error loading turmas:', error);
    res.status(500).json({ error: 'Erro ao carregar turmas' });
  }
});

// GET /api/turmas/suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT aci.curso_id, a.available_periods
       FROM aluno_curso_interests aci
       INNER JOIN alunos a ON a.id = aci.aluno_id
       WHERE aci.status = 'interested'`
    );

    const sugestoes = {};
    result.rows.forEach(row => {
      const cursoId = row.curso_id;
      const periodos = parsePgArray(row.available_periods);
      const effectivePeriodos = periodos.length > 0
        ? periodos
        : ['manha', 'tarde', 'noite'];

      if (!sugestoes[cursoId]) {
        sugestoes[cursoId] = { manha: 0, tarde: 0, noite: 0 };
      }
      effectivePeriodos.forEach(p => { sugestoes[cursoId][p]++; });
    });

    res.json(sugestoes);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ error: 'Erro ao gerar sugestões' });
  }
});

// POST /api/turmas
router.post('/', async (req, res) => {
  try {
    const { name, curso_id, sala_id, cadeiras, period, start_date, end_date, potencial_faturamento, imposto, days_of_week, professores } = req.body;

    const { investimento_anuncios } = req.body;
    const result = await pool.query(
      `INSERT INTO turmas (name, curso_id, sala_id, cadeiras, period, start_date, end_date, potencial_faturamento, imposto, investimento_anuncios, days_of_week)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [name, curso_id, sala_id || null, parseInt(cadeiras), period, start_date, end_date,
       parseFloat(potencial_faturamento) || 0, parseFloat(imposto) || 0, parseFloat(investimento_anuncios) || 0, days_of_week || null]
    );

    const turmaId = result.rows[0].id;

    // Add professor assignments
    if (professores && professores.length > 0) {
      const validProfs = professores.filter(p => p.professor_id && p.professor_id.trim() !== '');
      for (const prof of validProfs) {
        await pool.query(
          'INSERT INTO turma_professores (turma_id, professor_id, hours) VALUES ($1, $2, $3)',
          [turmaId, prof.professor_id, prof.hours || 0]
        );
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating turma:', error);
    res.status(500).json({ error: 'Erro ao criar turma' });
  }
});

// PUT /api/turmas/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, curso_id, sala_id, cadeiras, period, start_date, end_date, potencial_faturamento, imposto, days_of_week, professores } = req.body;

    const { investimento_anuncios } = req.body;
    const result = await pool.query(
      `UPDATE turmas SET name = $1, curso_id = $2, sala_id = $3, cadeiras = $4, period = $5,
       start_date = $6, end_date = $7, potencial_faturamento = $8, imposto = $9, investimento_anuncios = $10, days_of_week = $11
       WHERE id = $12 RETURNING *`,
      [name, curso_id, sala_id || null, parseInt(cadeiras), period, start_date, end_date,
       parseFloat(potencial_faturamento) || 0, parseFloat(imposto) || 0, parseFloat(investimento_anuncios) || 0, days_of_week || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }

    // Update professor assignments
    await pool.query('DELETE FROM turma_professores WHERE turma_id = $1', [id]);
    if (professores && professores.length > 0) {
      const validProfs = professores.filter(p => p.professor_id && p.professor_id.trim() !== '');
      for (const prof of validProfs) {
        await pool.query(
          'INSERT INTO turma_professores (turma_id, professor_id, hours) VALUES ($1, $2, $3)',
          [id, prof.professor_id, prof.hours || 0]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating turma:', error);
    res.status(500).json({ error: 'Erro ao atualizar turma' });
  }
});

// PATCH /api/turmas/:id/investimento — update ad spend inline
router.patch('/:id/investimento', async (req, res) => {
  try {
    const { id } = req.params;
    const { investimento_anuncios } = req.body;
    const result = await pool.query(
      'UPDATE turmas SET investimento_anuncios = $1 WHERE id = $2 RETURNING id, investimento_anuncios',
      [parseFloat(investimento_anuncios) || 0, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating investimento:', error);
    res.status(500).json({ error: 'Erro ao atualizar investimento' });
  }
});

// DELETE /api/turmas/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Move enrolled students back to interested
    const enrolled = await pool.query(
      `SELECT aci.id, a.nome FROM aluno_curso_interests aci
       INNER JOIN alunos a ON a.id = aci.aluno_id
       WHERE aci.turma_id = $1 AND aci.status = 'enrolled'`,
      [id]
    );

    if (enrolled.rows.length > 0) {
      await pool.query(
        `UPDATE aluno_curso_interests SET status = 'interested', turma_id = NULL
         WHERE turma_id = $1 AND status = 'enrolled'`,
        [id]
      );
    }

    const result = await pool.query('DELETE FROM turmas WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }

    res.json({ success: true, unenrolled_count: enrolled.rows.length });
  } catch (error) {
    console.error('Error deleting turma:', error);
    res.status(500).json({ error: 'Erro ao excluir turma' });
  }
});

export default router;
