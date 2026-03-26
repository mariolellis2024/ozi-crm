import { Router } from 'express';
import pool from '../db.js';
import { logActivity } from '../activityLog.js';

const router = Router();

// GET /api/pagamentos — list all payments with filters
router.get('/', async (req, res) => {
  try {
    const { status, aluno_id, turma_id } = req.query;
    
    // Auto-mark overdue payments
    await pool.query(
      `UPDATE pagamentos SET status = 'atrasado'
       WHERE status = 'pendente' AND due_date < CURRENT_DATE`
    );
    
    let query = `
      SELECT p.*, 
        a.nome as aluno_nome, a.whatsapp as aluno_whatsapp,
        c.nome as curso_nome,
        t.name as turma_nome
      FROM pagamentos p
      JOIN alunos a ON a.id = p.aluno_id
      JOIN cursos c ON c.id = p.curso_id
      LEFT JOIN turmas t ON t.id = p.turma_id
    `;
    const conditions = [];
    const params = [];
    
    if (status) {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }
    if (aluno_id) {
      params.push(aluno_id);
      conditions.push(`p.aluno_id = $${params.length}`);
    }
    if (turma_id) {
      params.push(turma_id);
      conditions.push(`p.turma_id = $${params.length}`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY p.due_date ASC`;
    
    const result = await pool.query(query, params);
    
    // Summary
    const summaryResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pendente') as pendente,
        COUNT(*) FILTER (WHERE status = 'pago') as pago,
        COUNT(*) FILTER (WHERE status = 'atrasado') as atrasado,
        COALESCE(SUM(valor) FILTER (WHERE status = 'pago'), 0) as total_pago,
        COALESCE(SUM(valor) FILTER (WHERE status = 'pendente'), 0) as total_pendente,
        COALESCE(SUM(valor) FILTER (WHERE status = 'atrasado'), 0) as total_atrasado
      FROM pagamentos
    `);
    
    res.json({
      data: result.rows.map(r => ({
        ...r,
        valor: parseFloat(r.valor)
      })),
      summary: {
        pendente: parseInt(summaryResult.rows[0].pendente),
        pago: parseInt(summaryResult.rows[0].pago),
        atrasado: parseInt(summaryResult.rows[0].atrasado),
        total_pago: parseFloat(summaryResult.rows[0].total_pago),
        total_pendente: parseFloat(summaryResult.rows[0].total_pendente),
        total_atrasado: parseFloat(summaryResult.rows[0].total_atrasado),
      }
    });
  } catch (error) {
    console.error('Error loading payments:', error);
    res.status(500).json({ error: 'Erro ao carregar pagamentos' });
  }
});

// GET /api/pagamentos/missing — enrolled students with missing or incomplete payments
router.get('/missing', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        i.aluno_id, a.nome as aluno_nome,
        i.curso_id, c.nome as curso_nome, c.preco as curso_preco,
        i.turma_id, t.name as turma_nome,
        COALESCE(SUM(p.valor), 0) as total_registrado,
        COALESCE(SUM(p.valor) FILTER (WHERE p.status = 'pago'), 0) as total_pago,
        COUNT(p.id)::int as parcelas_count
      FROM aluno_curso_interests i
      JOIN alunos a ON a.id = i.aluno_id
      JOIN cursos c ON c.id = i.curso_id
      LEFT JOIN turmas t ON t.id = i.turma_id
      LEFT JOIN pagamentos p ON p.aluno_id = i.aluno_id AND p.turma_id = i.turma_id
      WHERE i.status = 'enrolled' AND i.turma_id IS NOT NULL
      GROUP BY i.aluno_id, a.nome, i.curso_id, c.nome, c.preco, i.turma_id, t.name
      HAVING COALESCE(SUM(p.valor), 0) < c.preco
      ORDER BY COALESCE(SUM(p.valor), 0) ASC, a.nome
    `);
    res.json(result.rows.map(r => ({
      ...r,
      curso_preco: parseFloat(r.curso_preco),
      total_registrado: parseFloat(r.total_registrado),
      total_pago: parseFloat(r.total_pago),
    })));
  } catch (error) {
    console.error('Error loading missing payments:', error);
    res.status(500).json({ error: 'Erro ao carregar alunos sem pagamento' });
  }
});

// POST /api/pagamentos/generate — generate parcelas for an enrolled student
router.post('/generate', async (req, res) => {
  try {
    const { aluno_id, curso_id, turma_id, total_parcelas, valor_total, first_due_date } = req.body;
    
    if (!aluno_id || !curso_id || !total_parcelas || !valor_total || !first_due_date) {
      return res.status(400).json({ error: 'Campos obrigatórios: aluno_id, curso_id, total_parcelas, valor_total, first_due_date' });
    }
    
    const valorParcela = parseFloat(valor_total) / parseInt(total_parcelas);
    const parcelas = [];
    
    for (let i = 0; i < parseInt(total_parcelas); i++) {
      const dueDate = new Date(first_due_date);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      const result = await pool.query(
        `INSERT INTO pagamentos (aluno_id, curso_id, turma_id, parcela, total_parcelas, valor, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [aluno_id, curso_id, turma_id || null, i + 1, total_parcelas, valorParcela.toFixed(2), dueDate.toISOString().split('T')[0]]
      );
      parcelas.push(result.rows[0]);
    }

    // Get aluno name for log
    const alunoResult = await pool.query('SELECT nome FROM alunos WHERE id = $1', [aluno_id]);
    logActivity({
      userId: req.user?.id, userEmail: req.user?.email,
      action: 'create', entityType: 'pagamento',
      entityId: aluno_id, entityName: alunoResult.rows[0]?.nome,
      details: { total_parcelas, valor_total }
    });
    
    res.status(201).json(parcelas);
  } catch (error) {
    console.error('Error generating payments:', error);
    res.status(500).json({ error: 'Erro ao gerar parcelas' });
  }
});

// PUT /api/pagamentos/:id/pay — mark as paid
router.put('/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, notes } = req.body;
    
    const result = await pool.query(
      `UPDATE pagamentos SET status = 'pago', paid_date = CURRENT_DATE, payment_method = $2, notes = $3
       WHERE id = $1 RETURNING *`,
      [id, payment_method || null, notes || null]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }
    
    res.json({ ...result.rows[0], valor: parseFloat(result.rows[0].valor) });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Erro ao atualizar pagamento' });
  }
});

// PUT /api/pagamentos/:id/undo — mark as pending again
router.put('/:id/undo', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE pagamentos SET status = 'pendente', paid_date = NULL, payment_method = NULL
       WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }
    
    res.json({ ...result.rows[0], valor: parseFloat(result.rows[0].valor) });
  } catch (error) {
    console.error('Error undoing payment:', error);
    res.status(500).json({ error: 'Erro ao desfazer pagamento' });
  }
});

// DELETE /api/pagamentos/by-enrollment/:alunoId/:turmaId — bulk delete
// IMPORTANT: Must come BEFORE /:id to avoid Express matching 'by-enrollment' as :id
router.delete('/by-enrollment/:alunoId/:turmaId', async (req, res) => {
  try {
    const { alunoId, turmaId } = req.params;
    const result = await pool.query(
      'DELETE FROM pagamentos WHERE aluno_id = $1 AND turma_id = $2 RETURNING id',
      [alunoId, turmaId]
    );
    res.json({ success: true, deleted: result.rowCount });
  } catch (error) {
    console.error('Error bulk deleting payments:', error);
    res.status(500).json({ error: 'Erro ao excluir pagamentos' });
  }
});

// DELETE /api/pagamentos/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM pagamentos WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Erro ao excluir pagamento' });
  }
});

export default router;
