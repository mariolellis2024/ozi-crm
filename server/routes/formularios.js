import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/formularios — list forms (filtered by unidade_id)
router.get('/', async (req, res) => {
  try {
    const { unidade_id } = req.query;
    let query = `
      SELECT f.*, c.nome as curso_nome, c.imagem_url as curso_imagem,
             u.nome as unidade_nome,
             spg.nome as social_proof_group_nome,
             COALESCE((SELECT COUNT(*) FROM form_visits fv WHERE fv.formulario_id = f.id), 0)::int as visitas,
             COALESCE((SELECT COUNT(*) FROM aluno_curso_interests aci WHERE aci.formulario_id = f.id), 0)::int as cadastros
      FROM formularios f
      JOIN cursos c ON c.id = f.curso_id
      JOIN unidades u ON u.id = f.unidade_id
      LEFT JOIN social_proof_groups spg ON spg.id = f.social_proof_group_id
    `;
    const params = [];

    if (unidade_id) {
      params.push(unidade_id);
      query += ` WHERE f.unidade_id = $${params.length}`;
    }

    query += ' ORDER BY f.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error loading formularios:', error);
    res.status(500).json({ error: 'Erro ao carregar formulários' });
  }
});

// POST /api/formularios
router.post('/', async (req, res) => {
  try {
    const { slug, curso_id, unidade_id, titulo, descricao, social_proof_group_id } = req.body;

    if (!slug || !curso_id || !unidade_id) {
      return res.status(400).json({ error: 'Slug, curso e unidade são obrigatórios' });
    }

    // Check slug uniqueness
    const existing = await pool.query('SELECT id FROM formularios WHERE slug = $1', [slug]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Este slug já está em uso' });
    }

    const result = await pool.query(
      `INSERT INTO formularios (slug, curso_id, unidade_id, titulo, descricao, social_proof_group_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [slug, curso_id, unidade_id, titulo || null, descricao || null, social_proof_group_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating formulario:', error);
    res.status(500).json({ error: 'Erro ao criar formulário' });
  }
});

// PUT /api/formularios/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { slug, curso_id, unidade_id, titulo, descricao, ativo, social_proof_group_id } = req.body;

    // Check slug uniqueness (excluding self)
    if (slug) {
      const existing = await pool.query('SELECT id FROM formularios WHERE slug = $1 AND id != $2', [slug, id]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Este slug já está em uso' });
      }
    }

    const result = await pool.query(
      `UPDATE formularios SET slug = $1, curso_id = $2, unidade_id = $3, titulo = $4, descricao = $5, ativo = $6, social_proof_group_id = $7
       WHERE id = $8 RETURNING *`,
      [slug, curso_id, unidade_id, titulo || null, descricao || null, ativo !== false, social_proof_group_id || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating formulario:', error);
    res.status(500).json({ error: 'Erro ao atualizar formulário' });
  }
});

// DELETE /api/formularios/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM formularios WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting formulario:', error);
    res.status(500).json({ error: 'Erro ao excluir formulário' });
  }
});

export default router;
