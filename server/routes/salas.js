import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/salas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.nome, s.cadeiras, s.unidade_id, s.created_at,
             u.nome as unidade_nome
      FROM salas s
      LEFT JOIN unidades u ON u.id = s.unidade_id
      ORDER BY u.nome, s.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error loading salas:', error);
    res.status(500).json({ error: 'Erro ao carregar salas' });
  }
});

// GET /api/salas/simple
router.get('/simple', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.nome, s.cadeiras, s.unidade_id, u.nome as unidade_nome
      FROM salas s LEFT JOIN unidades u ON u.id = s.unidade_id
      ORDER BY u.nome, s.nome
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error loading salas:', error);
    res.status(500).json({ error: 'Erro ao carregar salas' });
  }
});

// POST /api/salas
router.post('/', async (req, res) => {
  try {
    const { nome, cadeiras, unidade_id } = req.body;
    const result = await pool.query(
      'INSERT INTO salas (nome, cadeiras, unidade_id) VALUES ($1, $2, $3) RETURNING *',
      [nome, parseInt(cadeiras), unidade_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating sala:', error);
    res.status(500).json({ error: 'Erro ao criar sala' });
  }
});

// PUT /api/salas/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cadeiras, unidade_id } = req.body;
    const result = await pool.query(
      'UPDATE salas SET nome = $1, cadeiras = $2, unidade_id = $3 WHERE id = $4 RETURNING *',
      [nome, parseInt(cadeiras), unidade_id || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating sala:', error);
    res.status(500).json({ error: 'Erro ao atualizar sala' });
  }
});

// DELETE /api/salas/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const inUse = await pool.query('SELECT id FROM turmas WHERE sala_id = $1 LIMIT 1', [id]);
    if (inUse.rows.length > 0) {
      return res.status(409).json({ error: 'Sala está sendo usada em uma ou mais turmas' });
    }

    const result = await pool.query('DELETE FROM salas WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting sala:', error);
    res.status(500).json({ error: 'Erro ao excluir sala' });
  }
});

export default router;
