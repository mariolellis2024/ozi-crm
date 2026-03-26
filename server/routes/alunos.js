import { Router } from 'express';
import pool, { parsePgArray } from '../db.js';
import { logActivity } from '../activityLog.js';

const router = Router();

// GET /api/alunos
router.get('/', async (req, res) => {
  try {
    const { search, status, curso, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    if (status === 'none') {
      // Students with no interests
      let whereClause = 'WHERE a.id NOT IN (SELECT DISTINCT aluno_id FROM aluno_curso_interests)';
      const params = [];
      let paramIndex = 1;

      if (search) {
        whereClause += ` AND (a.nome ILIKE $${paramIndex} OR a.email ILIKE $${paramIndex} OR a.whatsapp ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM alunos a ${whereClause}`,
        params
      );

      const dataResult = await pool.query(
        `SELECT a.id, a.nome, a.email, a.whatsapp, a.empresa, a.available_periods, a.created_at
         FROM alunos a ${whereClause}
         ORDER BY a.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, parseInt(limit), offset]
      );

      const alunos = dataResult.rows.map(a => ({ ...a, available_periods: parsePgArray(a.available_periods), curso_interests: [] }));
      res.json({ data: alunos, count: parseInt(countResult.rows[0].count) });

    } else if (status && status !== 'all') {
      // Students with specific interest status
      let whereClause = 'WHERE aci.status = $1';
      const params = [status];
      let paramIndex = 2;

      if (curso) {
        whereClause += ` AND aci.curso_id = $${paramIndex}`;
        params.push(curso);
        paramIndex++;
      }

      if (search) {
        whereClause += ` AND (a.nome ILIKE $${paramIndex} OR a.email ILIKE $${paramIndex} OR a.whatsapp ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      const dataResult = await pool.query(
        `SELECT aci.id as interest_id, aci.curso_id, aci.status, aci.created_at as interest_created_at,
                a.id, a.nome, a.email, a.whatsapp, a.empresa, a.available_periods, a.created_at,
                c.id as c_id, c.nome as c_nome, c.preco as c_preco
         FROM aluno_curso_interests aci
         INNER JOIN alunos a ON a.id = aci.aluno_id
         LEFT JOIN cursos c ON c.id = aci.curso_id
         ${whereClause}
         ORDER BY aci.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, parseInt(limit), offset]
      );

      // Group by student
      const studentsMap = new Map();
      dataResult.rows.forEach(row => {
        if (!studentsMap.has(row.id)) {
          studentsMap.set(row.id, {
            id: row.id,
            nome: row.nome,
            email: row.email,
            whatsapp: row.whatsapp,
            empresa: row.empresa,
            available_periods: parsePgArray(row.available_periods),
            created_at: row.created_at,
            curso_interests: []
          });
        }
        studentsMap.get(row.id).curso_interests.push({
          id: row.interest_id,
          curso_id: row.curso_id,
          status: row.status,
          curso: row.c_id ? { id: row.c_id, nome: row.c_nome, preco: parseFloat(row.c_preco) } : null
        });
      });

      const alunos = Array.from(studentsMap.values());

      // Count unique students
      const countParams = params.slice(0, curso ? 2 : 1);
      let countWhere = 'WHERE aci.status = $1';
      if (curso) countWhere += ' AND aci.curso_id = $2';
      if (search) {
        countWhere += ` AND (a.nome ILIKE $${countParams.length + 1} OR a.email ILIKE $${countParams.length + 1} OR a.whatsapp ILIKE $${countParams.length + 1})`;
        countParams.push(`%${search}%`);
      }

      const countResult = await pool.query(
        `SELECT COUNT(DISTINCT a.id) FROM aluno_curso_interests aci
         INNER JOIN alunos a ON a.id = aci.aluno_id ${countWhere}`,
        countParams
      );

      res.json({ data: alunos, count: parseInt(countResult.rows[0].count) });

    } else {
      // All students with their interests
      let whereClause = '';
      const params = [];
      let paramIndex = 1;

      if (search) {
        whereClause = `WHERE (a.nome ILIKE $${paramIndex} OR a.email ILIKE $${paramIndex} OR a.whatsapp ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM alunos a ${whereClause}`,
        params
      );

      const dataResult = await pool.query(
        `SELECT a.id, a.nome, a.email, a.whatsapp, a.empresa, a.available_periods, a.created_at
         FROM alunos a ${whereClause}
         ORDER BY a.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, parseInt(limit), offset]
      );

      // Load interests for these students
      if (dataResult.rows.length > 0) {
        const studentIds = dataResult.rows.map(a => a.id);
        const interestsResult = await pool.query(
          `SELECT aci.id, aci.aluno_id, aci.curso_id, aci.status,
                  c.id as c_id, c.nome as c_nome, c.preco as c_preco
           FROM aluno_curso_interests aci
           LEFT JOIN cursos c ON c.id = aci.curso_id
           WHERE aci.aluno_id = ANY($1)`,
          [studentIds]
        );

        const interestsByStudent = {};
        interestsResult.rows.forEach(row => {
          if (!interestsByStudent[row.aluno_id]) {
            interestsByStudent[row.aluno_id] = [];
          }
          interestsByStudent[row.aluno_id].push({
            id: row.id,
            curso_id: row.curso_id,
            status: row.status,
            curso: row.c_id ? { id: row.c_id, nome: row.c_nome, preco: parseFloat(row.c_preco) } : null
          });
        });

        const alunos = dataResult.rows.map(a => ({
          ...a,
          available_periods: parsePgArray(a.available_periods),
          curso_interests: interestsByStudent[a.id] || []
        }));

        res.json({ data: alunos, count: parseInt(countResult.rows[0].count) });
      } else {
        res.json({ data: [], count: 0 });
      }
    }
  } catch (error) {
    console.error('Error loading alunos:', error);
    res.status(500).json({ error: 'Erro ao carregar alunos' });
  }
});

// POST /api/alunos
router.post('/', async (req, res) => {
  try {
    const { nome, email, whatsapp, empresa, available_periods } = req.body;
    const result = await pool.query(
      `INSERT INTO alunos (nome, email, whatsapp, empresa, available_periods)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nome, email || null, whatsapp, empresa || null, available_periods || []]
    );
    const aluno = result.rows[0];
    logActivity({
      userId: req.user?.id, userEmail: req.user?.email,
      action: 'create', entityType: 'aluno',
      entityId: aluno.id, entityName: nome
    });
    res.status(201).json(aluno);
  } catch (error) {
    console.error('Error creating aluno:', error);
    res.status(500).json({ error: 'Erro ao criar aluno' });
  }
});

// PUT /api/alunos/bulk/periods
// IMPORTANT: Must come BEFORE /:id routes to avoid Express matching 'bulk' as :id
router.put('/bulk/periods', async (req, res) => {
  try {
    const { student_ids, available_periods } = req.body;
    await pool.query(
      `UPDATE alunos SET available_periods = $1 WHERE id = ANY($2)`,
      [available_periods, student_ids]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error bulk updating periods:', error);
    res.status(500).json({ error: 'Erro ao atualizar períodos' });
  }
});

// PUT /api/alunos/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, whatsapp, empresa, available_periods } = req.body;
    const result = await pool.query(
      `UPDATE alunos SET nome = $1, email = $2, whatsapp = $3, empresa = $4, available_periods = $5
       WHERE id = $6 RETURNING *`,
      [nome, email || null, whatsapp, empresa || null, available_periods || [], id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating aluno:', error);
    res.status(500).json({ error: 'Erro ao atualizar aluno' });
  }
});

// DELETE /api/alunos/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM alunos WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting aluno:', error);
    res.status(500).json({ error: 'Erro ao excluir aluno' });
  }
});

export default router;
