import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/unidades
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.*, 
        (SELECT COUNT(*) FROM salas s WHERE s.unidade_id = u.id) as total_salas,
        (SELECT COUNT(*) FROM turmas t 
         JOIN salas s ON s.id = t.sala_id 
         WHERE s.unidade_id = u.id) as total_turmas
      FROM unidades u 
      ORDER BY u.nome
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error loading unidades:', error);
    res.status(500).json({ error: 'Erro ao carregar unidades' });
  }
});

// POST /api/unidades
router.post('/', async (req, res) => {
  try {
    const { nome, cidade, endereco } = req.body;
    const result = await pool.query(
      'INSERT INTO unidades (nome, cidade, endereco) VALUES ($1, $2, $3) RETURNING *',
      [nome, cidade || null, endereco || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating unidade:', error);
    res.status(500).json({ error: 'Erro ao criar unidade' });
  }
});

// PUT /api/unidades/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cidade, endereco, meta_pixel_id, meta_capi_token, google_analytics_id } = req.body;
    const result = await pool.query(
      `UPDATE unidades SET nome = $1, cidade = $2, endereco = $3,
       meta_pixel_id = $4, meta_capi_token = $5, google_analytics_id = $6
       WHERE id = $7 RETURNING *`,
      [nome, cidade || null, endereco || null, meta_pixel_id || null, meta_capi_token || null, google_analytics_id || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unidade não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating unidade:', error);
    res.status(500).json({ error: 'Erro ao atualizar unidade' });
  }
});

// DELETE /api/unidades/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const inUse = await pool.query('SELECT id FROM salas WHERE unidade_id = $1 LIMIT 1', [id]);
    if (inUse.rows.length > 0) {
      return res.status(409).json({ error: 'Unidade possui salas associadas. Remova as salas primeiro.' });
    }
    const result = await pool.query('DELETE FROM unidades WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unidade não encontrada' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting unidade:', error);
    res.status(500).json({ error: 'Erro ao excluir unidade' });
  }
});

export default router;
