import { Router } from 'express';
import pool, { parsePgArray } from '../db.js';
import { sendMetaPurchase } from '../services/conversion.js';

const router = Router();

/**
 * Fire a Meta CAPI Purchase event when a student is enrolled.
 * Uses stored tracking data from the original Lead form visit.
 */
async function firePurchaseEvent(alunoId, cursoId) {
  try {
    const result = await pool.query(`
      SELECT 
        a.nome, a.whatsapp, a.email, a.meta_fbc, a.meta_fbp,
        a.meta_client_ip, a.meta_user_agent,
        a.genero, a.data_nascimento, a.cep,
        c.nome as curso_nome, c.preco, c.id as curso_id,
        u.meta_pixel_id, u.meta_capi_token, u.cidade as unidade_cidade
      FROM alunos a
      JOIN cursos c ON c.id = $2
      LEFT JOIN unidades u ON u.id = a.unidade_id
      WHERE a.id = $1
    `, [alunoId, cursoId]);

    if (result.rows.length === 0) return;
    const r = result.rows[0];
    if (!r.meta_pixel_id || !r.meta_capi_token) return;

    console.log('[Purchase CAPI] Firing for aluno:', alunoId, '| pixel:', r.meta_pixel_id, '| token ends:', r.meta_capi_token?.slice(-8));

    const cidadeParts = (r.unidade_cidade || '').split(' - ');
    const cidade = cidadeParts[0]?.trim() || '';
    const estado = cidadeParts[1]?.trim() || '';

    await sendMetaPurchase({
      pixelId: r.meta_pixel_id,
      accessToken: r.meta_capi_token,
      nome: r.nome,
      whatsapp: r.whatsapp,
      email: r.email || '',
      cidade,
      estado,
      value: parseFloat(r.preco) || 0,
      cursoNome: r.curso_nome,
      cursoId: r.curso_id,
      clientIp: r.meta_client_ip || '',
      clientUserAgent: r.meta_user_agent || '',
      fbc: r.meta_fbc || '',
      fbp: r.meta_fbp || '',
      externalId: alunoId,
      genero: r.genero || '',
      dataNascimento: r.data_nascimento || '',
      cep: r.cep || ''
    });
  } catch (err) {
    console.error('Error firing Purchase event:', err);
  }
}

// GET /api/interests — interests by curso for a specific aluno
router.get('/aluno/:alunoId', async (req, res) => {
  try {
    const { alunoId } = req.params;
    const result = await pool.query(
      `SELECT aci.id, aci.curso_id, aci.status, aci.turma_id, aci.created_at,
              c.id as c_id, c.nome as c_nome, c.preco as c_preco
       FROM aluno_curso_interests aci
       LEFT JOIN cursos c ON c.id = aci.curso_id
       WHERE aci.aluno_id = $1
       ORDER BY aci.created_at DESC`,
      [alunoId]
    );

    const interests = result.rows.map(r => ({
      id: r.id,
      curso_id: r.curso_id,
      status: r.status,
      turma_id: r.turma_id,
      created_at: r.created_at,
      curso: r.c_id ? { id: r.c_id, nome: r.c_nome, preco: parseFloat(r.c_preco) } : null
    }));

    res.json(interests);
  } catch (error) {
    console.error('Error loading interests:', error);
    res.status(500).json({ error: 'Erro ao carregar interesses' });
  }
});

// GET /api/interests/curso/:cursoId/interested — interested students for a course
router.get('/curso/:cursoId/interested', async (req, res) => {
  try {
    const { cursoId } = req.params;
    const { unidade_id } = req.query;

    let query = `SELECT a.id, a.nome, a.email, a.whatsapp, a.empresa, a.available_periods
       FROM aluno_curso_interests aci
       INNER JOIN alunos a ON a.id = aci.aluno_id
       WHERE aci.curso_id = $1 AND aci.status = 'interested' AND aci.turma_id IS NULL`;
    const params = [cursoId];

    if (unidade_id) {
      params.push(unidade_id);
      query += ` AND a.unidade_id = $${params.length}`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows.map(r => ({ ...r, available_periods: parsePgArray(r.available_periods) })));
  } catch (error) {
    console.error('Error loading interested students:', error);
    res.status(500).json({ error: 'Erro ao carregar alunos interessados' });
  }
});

// GET /api/interests/turma/:turmaId/enrolled — enrolled students count
router.get('/turma/:turmaId/enrolled-count', async (req, res) => {
  try {
    const { turmaId } = req.params;
    const result = await pool.query(
      `SELECT COUNT(*) FROM aluno_curso_interests WHERE turma_id = $1 AND status = 'enrolled'`,
      [turmaId]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error counting enrolled:', error);
    res.status(500).json({ error: 'Erro ao contar matriculados' });
  }
});

// GET /api/interests/turma/:turmaId/enrolled — enrolled students list
router.get('/turma/:turmaId/enrolled', async (req, res) => {
  try {
    const { turmaId } = req.params;
    const result = await pool.query(
      `SELECT a.id, a.nome, a.email, a.whatsapp, a.empresa, a.available_periods, aci.id as interest_id, u.full_name as enrolled_by_name
       FROM aluno_curso_interests aci
       INNER JOIN alunos a ON a.id = aci.aluno_id
       LEFT JOIN users u ON u.id = aci.enrolled_by
       WHERE aci.turma_id = $1 AND aci.status = 'enrolled'`,
      [turmaId]
    );
    res.json(result.rows.map(r => ({ ...r, available_periods: parsePgArray(r.available_periods) })));
  } catch (error) {
    console.error('Error loading enrolled students:', error);
    res.status(500).json({ error: 'Erro ao carregar alunos matriculados' });
  }
});

// POST /api/interests — add interest
router.post('/', async (req, res) => {
  try {
    const { aluno_id, curso_id, status } = req.body;
    const result = await pool.query(
      `INSERT INTO aluno_curso_interests (aluno_id, curso_id, status)
       VALUES ($1, $2, $3) RETURNING *`,
      [aluno_id, curso_id, status || 'interested']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Interesse já existe' });
    }
    console.error('Error creating interest:', error);
    res.status(500).json({ error: 'Erro ao criar interesse' });
  }
});

// POST /api/interests/bulk — bulk upsert interests
router.post('/bulk', async (req, res) => {
  try {
    const { interests } = req.body; // [{ aluno_id, curso_id, status }]
    for (const interest of interests) {
      await pool.query(
        `INSERT INTO aluno_curso_interests (aluno_id, curso_id, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (aluno_id, curso_id) DO NOTHING`,
        [interest.aluno_id, interest.curso_id, interest.status || 'interested']
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error bulk creating interests:', error);
    res.status(500).json({ error: 'Erro ao criar interesses em lote' });
  }
});

// POST /api/interests/bulk-delete — bulk delete interests
router.post('/bulk-delete', async (req, res) => {
  try {
    const { student_ids, curso_ids } = req.body;
    await pool.query(
      'DELETE FROM aluno_curso_interests WHERE aluno_id = ANY($1) AND curso_id = ANY($2)',
      [student_ids, curso_ids]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error bulk deleting interests:', error);
    res.status(500).json({ error: 'Erro ao excluir interesses em lote' });
  }
});

// GET /api/interests/check-conflict — check schedule conflict before enrolling
router.get('/check-conflict', async (req, res) => {
  try {
    const { aluno_id, turma_id } = req.query;

    const newTurma = await pool.query('SELECT period, start_date, end_date, days_of_week FROM turmas WHERE id = $1', [turma_id]);
    if (newTurma.rows.length === 0) {
      return res.json({ hasConflict: false });
    }

    const enrolledTurmas = await pool.query(
      `SELECT t.period, t.start_date, t.end_date, t.days_of_week
       FROM aluno_curso_interests aci
       INNER JOIN turmas t ON t.id = aci.turma_id
       WHERE aci.aluno_id = $1 AND aci.status = 'enrolled' AND aci.turma_id IS NOT NULL AND aci.turma_id != $2`,
      [aluno_id, turma_id]
    );

    const nt = newTurma.rows[0];
    for (const et of enrolledTurmas.rows) {
      if (et.period === nt.period) {
        const nStart = new Date(nt.start_date);
        const nEnd = new Date(nt.end_date);
        const eStart = new Date(et.start_date);
        const eEnd = new Date(et.end_date);
        if (nStart <= eEnd && nEnd >= eStart) {
          return res.json({ hasConflict: true });
        }
      }
    }

    res.json({ hasConflict: false });
  } catch (error) {
    console.error('Error checking conflict:', error);
    res.json({ hasConflict: false });
  }
});

// POST /api/interests/enroll — enroll student in turma
router.post('/enroll', async (req, res) => {
  try {
    const { aluno_id, curso_id, turma_id, email, genero, data_nascimento, cep } = req.body;

    // Save enrollment data (email, genero, data_nascimento, cep) to aluno
    if (email || genero || data_nascimento || cep) {
      await pool.query(
        `UPDATE alunos SET email = COALESCE($2, email), genero = COALESCE($3, genero), data_nascimento = COALESCE($4, data_nascimento), cep = COALESCE($5, cep) WHERE id = $1`,
        [aluno_id, email || null, genero || null, data_nascimento || null, cep || null]
      );
    }

    // Check schedule conflicts
    const newTurma = await pool.query('SELECT period, start_date, end_date FROM turmas WHERE id = $1', [turma_id]);
    if (newTurma.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }

    const enrolledTurmas = await pool.query(
      `SELECT t.period, t.start_date, t.end_date
       FROM aluno_curso_interests aci
       INNER JOIN turmas t ON t.id = aci.turma_id
       WHERE aci.aluno_id = $1 AND aci.status = 'enrolled' AND aci.turma_id IS NOT NULL`,
      [aluno_id]
    );

    const nt = newTurma.rows[0];
    for (const et of enrolledTurmas.rows) {
      if (et.period === nt.period) {
        const nStart = new Date(nt.start_date);
        const nEnd = new Date(nt.end_date);
        const eStart = new Date(et.start_date);
        const eEnd = new Date(et.end_date);
        if (nStart <= eEnd && nEnd >= eStart) {
          return res.status(409).json({ error: 'Conflito de horário com outra turma' });
        }
      }
    }

    const result = await pool.query(
      `UPDATE aluno_curso_interests SET status = 'enrolled', turma_id = $1, enrolled_by = $4
       WHERE aluno_id = $2 AND curso_id = $3 RETURNING *`,
      [turma_id, aluno_id, curso_id, req.user?.id || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Interesse não encontrado' });
    }

    // Fire Purchase event to Meta CAPI
    firePurchaseEvent(aluno_id, curso_id);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error enrolling student:', error);
    res.status(500).json({ error: 'Erro ao matricular aluno' });
  }
});

// PUT /api/interests/enroll — enroll student (legacy, keep for compatibility)
router.put('/enroll', async (req, res) => {
  try {
    const { aluno_id, curso_id, turma_id } = req.body;

    const result = await pool.query(
      `UPDATE aluno_curso_interests SET status = 'enrolled', turma_id = $1, enrolled_by = $4
       WHERE aluno_id = $2 AND curso_id = $3 RETURNING *`,
      [turma_id, aluno_id, curso_id, req.user?.id || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Interesse não encontrado' });
    }

    // Fire Purchase event to Meta CAPI
    firePurchaseEvent(aluno_id, curso_id);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error enrolling student:', error);
    res.status(500).json({ error: 'Erro ao matricular aluno' });
  }
});

// PUT /api/interests/unenroll — unenroll student from turma
router.put('/unenroll', async (req, res) => {
  try {
    const { aluno_id, curso_id } = req.body;
    const result = await pool.query(
      `UPDATE aluno_curso_interests SET status = 'interested', turma_id = NULL
       WHERE aluno_id = $1 AND curso_id = $2 RETURNING *`,
      [aluno_id, curso_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Interesse não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error unenrolling student:', error);
    res.status(500).json({ error: 'Erro ao desmatricular aluno' });
  }
});

// PUT /api/interests/:id/status — update interest status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // When moving back to interested, clear turma_id so student appears in interested list
    let result;
    if (status === 'interested') {
      result = await pool.query(
        'UPDATE aluno_curso_interests SET status = $1, turma_id = NULL WHERE id = $2 RETURNING *',
        [status, id]
      );
    } else if (status === 'enrolled') {
      result = await pool.query(
        'UPDATE aluno_curso_interests SET status = $1, enrolled_by = $3 WHERE id = $2 RETURNING *',
        [status, id, req.user?.id || null]
      );
    } else {
      result = await pool.query(
        'UPDATE aluno_curso_interests SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Interesse não encontrado' });
    }

    // Fire Purchase event when status changes to enrolled
    if (status === 'enrolled') {
      firePurchaseEvent(result.rows[0].aluno_id, result.rows[0].curso_id);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating interest status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// DELETE /api/interests/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM aluno_curso_interests WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Interesse não encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting interest:', error);
    res.status(500).json({ error: 'Erro ao excluir interesse' });
  }
});

// DELETE /api/interests/by-aluno-curso
router.delete('/by-aluno-curso/:alunoId/:cursoId', async (req, res) => {
  try {
    const { alunoId, cursoId } = req.params;
    const result = await pool.query(
      'DELETE FROM aluno_curso_interests WHERE aluno_id = $1 AND curso_id = $2 RETURNING id',
      [alunoId, cursoId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Interesse não encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting interest:', error);
    res.status(500).json({ error: 'Erro ao excluir interesse' });
  }
});

// GET /api/interests/all — all interests (for dashboard)
router.get('/all', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT curso_id, status FROM aluno_curso_interests'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error loading all interests:', error);
    res.status(500).json({ error: 'Erro ao carregar interesses' });
  }
});

export default router;
