import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/contact-history/:alunoId — get contact history for a student
router.get('/:alunoId', async (req, res) => {
  try {
    const { alunoId } = req.params;
    const result = await pool.query(`
      SELECT ch.*, u.email as user_email, u.full_name as user_name
      FROM contact_history ch
      LEFT JOIN users u ON u.id = ch.user_id
      WHERE ch.aluno_id = $1
      ORDER BY ch.created_at DESC
    `, [alunoId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error loading contact history:', error);
    res.status(500).json({ error: 'Erro ao carregar histórico' });
  }
});

// POST /api/contact-history — add a contact entry
router.post('/', async (req, res) => {
  try {
    const { aluno_id, tipo, descricao, motivo_perda } = req.body;
    const user_id = req.user?.id || null;
    const result = await pool.query(
      `INSERT INTO contact_history (aluno_id, user_id, tipo, descricao, motivo_perda)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [aluno_id, user_id, tipo || 'contato', descricao, motivo_perda || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating contact entry:', error);
    res.status(500).json({ error: 'Erro ao salvar histórico' });
  }
});

// DELETE /api/contact-history/:id — delete a contact entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM contact_history WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact entry:', error);
    res.status(500).json({ error: 'Erro ao excluir registro' });
  }
});

export default router;
