import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/professor-pagamentos — list all professor payments
router.get('/', async (req, res) => {
  try {
    const { status, unidade_id } = req.query;
    let query = `
      SELECT pp.*,
             p.nome as professor_nome, p.whatsapp as professor_whatsapp,
             t.name as turma_nome, t.start_date as turma_start, t.end_date as turma_end,
             c.nome as curso_nome,
             u.nome as unidade_nome
      FROM professor_pagamentos pp
      JOIN professores p ON p.id = pp.professor_id
      JOIN turmas t ON t.id = pp.turma_id
      JOIN cursos c ON c.id = t.curso_id
      LEFT JOIN unidades u ON u.id = p.unidade_id
    `;
    const params = [];
    const conditions = [];

    if (status) {
      params.push(status);
      conditions.push(`pp.status = $${params.length}`);
    }
    if (unidade_id) {
      params.push(unidade_id);
      conditions.push(`p.unidade_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY pp.due_date ASC';

    const result = await pool.query(query, params);

    // Calculate summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let total_pago = 0, total_pendente = 0, total_atrasado = 0;
    let count_pago = 0, count_pendente = 0, count_atrasado = 0;

    result.rows.forEach(row => {
      const valor = parseFloat(row.valor);
      if (row.status === 'pago') {
        total_pago += valor;
        count_pago++;
      } else {
        const due = new Date(row.due_date + 'T23:59:59');
        if (due < today) {
          total_atrasado += valor;
          count_atrasado++;
        } else {
          total_pendente += valor;
          count_pendente++;
        }
      }
    });

    res.json({
      data: result.rows.map(r => ({
        ...r,
        valor: parseFloat(r.valor)
      })),
      summary: {
        pago: count_pago,
        pendente: count_pendente,
        atrasado: count_atrasado,
        total_pago,
        total_pendente,
        total_atrasado
      }
    });
  } catch (error) {
    console.error('Error loading professor pagamentos:', error);
    res.status(500).json({ error: 'Erro ao carregar pagamentos de professores' });
  }
});

// PUT /api/professor-pagamentos/:id/pay — mark as paid
router.put('/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { recibo_url } = req.body;
    const result = await pool.query(
      `UPDATE professor_pagamentos
       SET status = 'pago', paid_date = CURRENT_DATE, recibo_url = COALESCE($2, recibo_url)
       WHERE id = $1 RETURNING *`,
      [id, recibo_url || null]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pagamento não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking professor payment as paid:', error);
    res.status(500).json({ error: 'Erro ao confirmar pagamento' });
  }
});

// PUT /api/professor-pagamentos/:id/undo — undo payment
router.put('/:id/undo', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE professor_pagamentos SET status = 'pendente', paid_date = NULL WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pagamento não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error undoing professor payment:', error);
    res.status(500).json({ error: 'Erro ao estornar pagamento' });
  }
});

// PUT /api/professor-pagamentos/:id/recibo — attach receipt
router.put('/:id/recibo', async (req, res) => {
  try {
    const { id } = req.params;
    const { recibo_url } = req.body;
    const result = await pool.query(
      `UPDATE professor_pagamentos SET recibo_url = $2 WHERE id = $1 RETURNING *`,
      [id, recibo_url]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pagamento não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error attaching recibo:', error);
    res.status(500).json({ error: 'Erro ao anexar recibo' });
  }
});

// PUT /api/professor-pagamentos/:id/nota-fiscal — attach invoice
router.put('/:id/nota-fiscal', async (req, res) => {
  try {
    const { id } = req.params;
    const { nota_fiscal_url } = req.body;
    const result = await pool.query(
      `UPDATE professor_pagamentos SET nota_fiscal_url = $2 WHERE id = $1 RETURNING *`,
      [id, nota_fiscal_url]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pagamento não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error attaching nota fiscal:', error);
    res.status(500).json({ error: 'Erro ao anexar nota fiscal' });
  }
});

// POST /api/professor-pagamentos/generate — generate payments for a turma_professor
router.post('/generate', async (req, res) => {
  try {
    const { turma_professor_id } = req.body;
    
    // Get turma_professor info
    const tpResult = await pool.query(
      `SELECT tp.*, t.start_date, t.end_date, p.valor_hora
       FROM turma_professores tp
       JOIN turmas t ON t.id = tp.turma_id
       JOIN professores p ON p.id = tp.professor_id
       WHERE tp.id = $1`,
      [turma_professor_id]
    );

    if (tpResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vínculo professor-turma não encontrado' });
    }

    const tp = tpResult.rows[0];
    const totalValue = Number(tp.hours) * Number(tp.valor_hora);
    const isSingleDay = tp.start_date === tp.end_date ||
      new Date(tp.start_date).toISOString().split('T')[0] === new Date(tp.end_date).toISOString().split('T')[0];

    // Check if payments already exist
    const existing = await pool.query(
      'SELECT id FROM professor_pagamentos WHERE turma_professor_id = $1',
      [turma_professor_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Pagamentos já gerados para este vínculo' });
    }

    let result;
    if (isSingleDay) {
      // Single-day event: 100% on the day
      result = await pool.query(
        `INSERT INTO professor_pagamentos (turma_professor_id, professor_id, turma_id, parcela, valor, due_date)
         VALUES ($1, $2, $3, 1, $4, $5)
         RETURNING *`,
        [turma_professor_id, tp.professor_id, tp.turma_id, totalValue, tp.start_date]
      );
    } else {
      // Multi-day: 50% on start_date, 50% on end_date
      const half = Math.round(totalValue * 100 / 2) / 100;
      result = await pool.query(
        `INSERT INTO professor_pagamentos (turma_professor_id, professor_id, turma_id, parcela, valor, due_date)
         VALUES ($1, $2, $3, 1, $4, $5), ($1, $2, $3, 2, $6, $7)
         RETURNING *`,
        [
          turma_professor_id, tp.professor_id, tp.turma_id,
          half, tp.start_date,
          totalValue - half, tp.end_date
        ]
      );
    }

    res.status(201).json(result.rows);
  } catch (error) {
    console.error('Error generating professor payments:', error);
    res.status(500).json({ error: 'Erro ao gerar pagamentos' });
  }
});

// POST /api/professor-pagamentos/sync — generate payments for ALL existing turma_professores missing payments
router.post('/sync', async (req, res) => {
  try {
    const tpResult = await pool.query(
      `SELECT tp.id, tp.professor_id, tp.turma_id, tp.hours,
              t.start_date, t.end_date, p.valor_hora
       FROM turma_professores tp
       JOIN turmas t ON t.id = tp.turma_id
       JOIN professores p ON p.id = tp.professor_id
       WHERE tp.id NOT IN (SELECT DISTINCT turma_professor_id FROM professor_pagamentos)
       AND tp.hours > 0`
    );

    let generated = 0;
    for (const tp of tpResult.rows) {
      const totalValue = Number(tp.hours) * Number(tp.valor_hora);
      if (totalValue <= 0) continue;

      const startStr = new Date(tp.start_date).toISOString().split('T')[0];
      const endStr = new Date(tp.end_date).toISOString().split('T')[0];
      const isSingleDay = startStr === endStr;

      if (isSingleDay) {
        await pool.query(
          `INSERT INTO professor_pagamentos (turma_professor_id, professor_id, turma_id, parcela, valor, due_date) VALUES ($1, $2, $3, 1, $4, $5)`,
          [tp.id, tp.professor_id, tp.turma_id, totalValue, tp.start_date]
        );
      } else {
        const half = Math.round(totalValue * 100 / 2) / 100;
        await pool.query(
          `INSERT INTO professor_pagamentos (turma_professor_id, professor_id, turma_id, parcela, valor, due_date) VALUES ($1, $2, $3, 1, $4, $5), ($1, $2, $3, 2, $6, $7)`,
          [tp.id, tp.professor_id, tp.turma_id, half, tp.start_date, totalValue - half, tp.end_date]
        );
      }
      generated++;
    }

    res.json({ success: true, generated, message: `${generated} vínculo(s) sincronizado(s)` });
  } catch (error) {
    console.error('Error syncing professor payments:', error);
    res.status(500).json({ error: 'Erro ao sincronizar pagamentos' });
  }
});

export default router;
