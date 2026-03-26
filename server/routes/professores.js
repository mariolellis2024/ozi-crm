import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/professores
router.get('/', async (req, res) => {
  try {
    const [professoresResult, turmasResult] = await Promise.all([
      pool.query(`SELECT p.id, p.nome, p.email, p.whatsapp, p.valor_hora, p.unidade_id, p.created_at,
                         u.nome as unidade_nome
                  FROM professores p
                  LEFT JOIN unidades u ON u.id = p.unidade_id
                  ORDER BY p.created_at DESC`),
      pool.query(
        `SELECT tp.professor_id, tp.hours, t.id as turma_id, t.start_date, t.end_date
         FROM turma_professores tp
         LEFT JOIN turmas t ON t.id = tp.turma_id`
      )
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const professores = professoresResult.rows.map(professor => {
      const professorTurmas = turmasResult.rows.filter(tp => tp.professor_id === professor.id);
      let total_a_receber = 0;
      let total_recebido = 0;

      professorTurmas.forEach(tp => {
        if (tp.end_date) {
          const endDate = new Date(tp.end_date);
          endDate.setHours(0, 0, 0, 0);
          const earnings = Number(tp.hours) * Number(professor.valor_hora);

          if (endDate <= today) {
            total_recebido += earnings;
          } else {
            total_a_receber += earnings;
          }
        }
      });

      return {
        ...professor,
        valor_hora: parseFloat(professor.valor_hora),
        total_a_receber,
        total_recebido
      };
    });

    res.json(professores);
  } catch (error) {
    console.error('Error loading professores:', error);
    res.status(500).json({ error: 'Erro ao carregar professores' });
  }
});

// GET /api/professores/simple
router.get('/simple', async (req, res) => {
  try {
    const result = await pool.query('SELECT p.id, p.nome, p.valor_hora, p.unidade_id, u.nome as unidade_nome FROM professores p LEFT JOIN unidades u ON u.id = p.unidade_id ORDER BY p.nome');
    res.json(result.rows.map(r => ({ ...r, valor_hora: parseFloat(r.valor_hora) })));
  } catch (error) {
    console.error('Error loading professores:', error);
    res.status(500).json({ error: 'Erro ao carregar professores' });
  }
});

// POST /api/professores
router.post('/', async (req, res) => {
  try {
    const { nome, email, whatsapp, valor_hora, unidade_id } = req.body;
    const result = await pool.query(
      'INSERT INTO professores (nome, email, whatsapp, valor_hora, unidade_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nome, email, whatsapp, parseFloat(valor_hora), unidade_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating professor:', error);
    res.status(500).json({ error: 'Erro ao criar professor' });
  }
});

// PUT /api/professores/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, whatsapp, valor_hora, unidade_id } = req.body;
    const result = await pool.query(
      'UPDATE professores SET nome = $1, email = $2, whatsapp = $3, valor_hora = $4, unidade_id = $5 WHERE id = $6 RETURNING *',
      [nome, email, whatsapp, parseFloat(valor_hora), unidade_id || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Professor não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating professor:', error);
    res.status(500).json({ error: 'Erro ao atualizar professor' });
  }
});

// DELETE /api/professores/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if professor is in use
    const inUse = await pool.query('SELECT id FROM turma_professores WHERE professor_id = $1 LIMIT 1', [id]);
    if (inUse.rows.length > 0) {
      return res.status(409).json({ error: 'Professor está atribuído a uma ou mais turmas' });
    }

    const result = await pool.query('DELETE FROM professores WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Professor não encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting professor:', error);
    res.status(500).json({ error: 'Erro ao excluir professor' });
  }
});

export default router;
