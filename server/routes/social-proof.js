import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// =====================================================
// Groups
// =====================================================

// GET /api/social-proof/groups — list all groups with item count
router.get('/groups', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.*, 
        (SELECT COUNT(*) FROM social_proof_items spi WHERE spi.group_id = g.id)::int as item_count
      FROM social_proof_groups g
      ORDER BY g.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error loading social proof groups:', error);
    res.status(500).json({ error: 'Erro ao carregar grupos' });
  }
});

// POST /api/social-proof/groups
router.post('/groups', async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
    const result = await pool.query(
      'INSERT INTO social_proof_groups (nome) VALUES ($1) RETURNING *',
      [nome]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Erro ao criar grupo' });
  }
});

// PUT /api/social-proof/groups/:id
router.put('/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    const result = await pool.query(
      'UPDATE social_proof_groups SET nome = $1 WHERE id = $2 RETURNING *',
      [nome, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Erro ao atualizar grupo' });
  }
});

// DELETE /api/social-proof/groups/:id
router.delete('/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM social_proof_groups WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Não encontrado' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Erro ao excluir grupo' });
  }
});

// =====================================================
// Items within a group
// =====================================================

// GET /api/social-proof/groups/:groupId/items
router.get('/groups/:groupId/items', async (req, res) => {
  try {
    const { groupId } = req.params;
    const result = await pool.query(
      'SELECT * FROM social_proof_items WHERE group_id = $1 ORDER BY ordem ASC',
      [groupId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error loading items:', error);
    res.status(500).json({ error: 'Erro ao carregar itens' });
  }
});

// POST /api/social-proof/groups/:groupId/items
router.post('/groups/:groupId/items', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { nome, foto_url, metricas, total_seguidores, ordem } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

    const result = await pool.query(
      `INSERT INTO social_proof_items (group_id, nome, foto_url, metricas, total_seguidores, ordem)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [groupId, nome, foto_url || null, JSON.stringify(metricas || []), total_seguidores || null, ordem || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Erro ao criar item' });
  }
});

// PUT /api/social-proof/items/:id
router.put('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, foto_url, metricas, total_seguidores, ordem } = req.body;

    const result = await pool.query(
      `UPDATE social_proof_items SET nome = $1, foto_url = $2, metricas = $3, total_seguidores = $4, ordem = $5
       WHERE id = $6 RETURNING *`,
      [nome, foto_url || null, JSON.stringify(metricas || []), total_seguidores || null, ordem || 0, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Erro ao atualizar item' });
  }
});

// DELETE /api/social-proof/items/:id
router.delete('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM social_proof_items WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Não encontrado' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Erro ao excluir item' });
  }
});

export default router;
