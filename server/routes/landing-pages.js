import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/landing-pages — list (filtered by unidade_id)
router.get('/', async (req, res) => {
  try {
    const { unidade_id } = req.query;
    let query = `
      SELECT lp.*, c.nome as curso_nome, c.imagem_url as curso_imagem,
             u.nome as unidade_nome,
             spg.nome as social_proof_group_nome,
             COALESCE((SELECT COUNT(*) FROM landing_page_visits lpv WHERE lpv.landing_page_id = lp.id), 0)::int as visitas,
             COALESCE((SELECT COUNT(*) FROM aluno_curso_interests aci WHERE aci.landing_page_id = lp.id), 0)::int as cadastros
      FROM landing_pages lp
      JOIN cursos c ON c.id = lp.curso_id
      JOIN unidades u ON u.id = lp.unidade_id
      LEFT JOIN social_proof_groups spg ON spg.id = lp.social_proof_group_id
    `;
    const params = [];

    if (unidade_id) {
      params.push(unidade_id);
      query += ` WHERE lp.unidade_id = $${params.length}`;
    }

    query += ' ORDER BY lp.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error loading landing pages:', error);
    res.status(500).json({ error: 'Erro ao carregar landing pages' });
  }
});

// GET /api/landing-pages/:id — single LP for editing
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT lp.*, c.nome as curso_nome, u.nome as unidade_nome
       FROM landing_pages lp
       JOIN cursos c ON c.id = lp.curso_id
       JOIN unidades u ON u.id = lp.unidade_id
       WHERE lp.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Landing page não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error loading landing page:', error);
    res.status(500).json({ error: 'Erro ao carregar landing page' });
  }
});

// POST /api/landing-pages
router.post('/', async (req, res) => {
  try {
    const {
      slug, curso_id, unidade_id,
      hero_headline, hero_subheadline, hero_image_url,
      para_quem_headline, para_quem_texto, sem_curso_items, com_curso_items,
      bonus_titulo, bonus_descricao, bonus_entrega, bonus_image_url,
      investimento_headline, investimento_descricao,
      preco_parcelas, preco_valor_parcela, preco_desconto, investimento_items,
      social_proof_headline1, social_proof_headline2, social_proof_group_id
    } = req.body;

    if (!slug || !curso_id || !unidade_id) {
      return res.status(400).json({ error: 'Slug, curso e unidade são obrigatórios' });
    }

    // Check slug uniqueness across both formularios and landing_pages
    const existingLP = await pool.query('SELECT id FROM landing_pages WHERE slug = $1', [slug]);
    const existingForm = await pool.query('SELECT id FROM formularios WHERE slug = $1', [slug]);
    if (existingLP.rows.length > 0 || existingForm.rows.length > 0) {
      return res.status(409).json({ error: 'Este slug já está em uso' });
    }

    const result = await pool.query(
      `INSERT INTO landing_pages (
        slug, curso_id, unidade_id,
        hero_headline, hero_subheadline, hero_image_url,
        para_quem_headline, para_quem_texto, sem_curso_items, com_curso_items,
        bonus_titulo, bonus_descricao, bonus_entrega, bonus_image_url,
        investimento_headline, investimento_descricao,
        preco_parcelas, preco_valor_parcela, preco_desconto, investimento_items,
        social_proof_headline1, social_proof_headline2, social_proof_group_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
      RETURNING *`,
      [
        slug, curso_id, unidade_id,
        hero_headline || null, hero_subheadline || null, hero_image_url || null,
        para_quem_headline || null, para_quem_texto || null,
        JSON.stringify(sem_curso_items || []), JSON.stringify(com_curso_items || []),
        bonus_titulo || null, bonus_descricao || null, bonus_entrega || null, bonus_image_url || null,
        investimento_headline || null, investimento_descricao || null,
        preco_parcelas || 12, preco_valor_parcela || null, preco_desconto || null,
        JSON.stringify(investimento_items || []),
        social_proof_headline1 || null, social_proof_headline2 || null,
        social_proof_group_id || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating landing page:', error);
    res.status(500).json({ error: 'Erro ao criar landing page' });
  }
});

// PUT /api/landing-pages/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      slug, curso_id, unidade_id, ativo,
      hero_headline, hero_subheadline, hero_image_url,
      para_quem_headline, para_quem_texto, sem_curso_items, com_curso_items,
      bonus_titulo, bonus_descricao, bonus_entrega, bonus_image_url,
      investimento_headline, investimento_descricao,
      preco_parcelas, preco_valor_parcela, preco_desconto, investimento_items,
      social_proof_headline1, social_proof_headline2, social_proof_group_id
    } = req.body;

    // Check slug uniqueness (excluding self)
    if (slug) {
      const existingLP = await pool.query('SELECT id FROM landing_pages WHERE slug = $1 AND id != $2', [slug, id]);
      const existingForm = await pool.query('SELECT id FROM formularios WHERE slug = $1', [slug]);
      if (existingLP.rows.length > 0 || existingForm.rows.length > 0) {
        return res.status(409).json({ error: 'Este slug já está em uso' });
      }
    }

    const result = await pool.query(
      `UPDATE landing_pages SET
        slug=$1, curso_id=$2, unidade_id=$3, ativo=$4,
        hero_headline=$5, hero_subheadline=$6, hero_image_url=$7,
        para_quem_headline=$8, para_quem_texto=$9, sem_curso_items=$10, com_curso_items=$11,
        bonus_titulo=$12, bonus_descricao=$13, bonus_entrega=$14, bonus_image_url=$15,
        investimento_headline=$16, investimento_descricao=$17,
        preco_parcelas=$18, preco_valor_parcela=$19, preco_desconto=$20, investimento_items=$21,
        social_proof_headline1=$22, social_proof_headline2=$23, social_proof_group_id=$24
       WHERE id=$25 RETURNING *`,
      [
        slug, curso_id, unidade_id, ativo !== false,
        hero_headline || null, hero_subheadline || null, hero_image_url || null,
        para_quem_headline || null, para_quem_texto || null,
        JSON.stringify(sem_curso_items || []), JSON.stringify(com_curso_items || []),
        bonus_titulo || null, bonus_descricao || null, bonus_entrega || null, bonus_image_url || null,
        investimento_headline || null, investimento_descricao || null,
        preco_parcelas || 12, preco_valor_parcela || null, preco_desconto || null,
        JSON.stringify(investimento_items || []),
        social_proof_headline1 || null, social_proof_headline2 || null,
        social_proof_group_id || null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Landing page não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating landing page:', error);
    res.status(500).json({ error: 'Erro ao atualizar landing page' });
  }
});

// DELETE /api/landing-pages/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM landing_pages WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Landing page não encontrada' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting landing page:', error);
    res.status(500).json({ error: 'Erro ao excluir landing page' });
  }
});

export default router;
