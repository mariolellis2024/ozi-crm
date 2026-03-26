import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/categorias
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM categorias ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error('Error loading categorias:', error);
    res.status(500).json({ error: 'Erro ao carregar categorias' });
  }
});

// POST /api/categorias
router.post('/', async (req, res) => {
  try {
    const { nome } = req.body;
    const result = await pool.query(
      'INSERT INTO categorias (nome) VALUES ($1) RETURNING *',
      [nome]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating categoria:', error);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// PUT /api/categorias/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    const result = await pool.query(
      'UPDATE categorias SET nome = $1 WHERE id = $2 RETURNING *',
      [nome, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating categoria:', error);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

// DELETE /api/categorias/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const inUse = await pool.query('SELECT id FROM cursos WHERE categoria_id = $1 LIMIT 1', [id]);
    if (inUse.rows.length > 0) {
      return res.status(409).json({ error: 'Categoria está sendo usada por cursos' });
    }

    const result = await pool.query('DELETE FROM categorias WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting categoria:', error);
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
});

export default router;
