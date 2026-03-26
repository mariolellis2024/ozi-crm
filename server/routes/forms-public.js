import { Router } from 'express';
import pool, { parsePgArray } from '../db.js';
import { sendMetaConversion } from '../services/conversion.js';

const router = Router();

// GET /api/public/forms/:slug — public form data
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      `SELECT f.id, f.slug, f.titulo, f.descricao, f.ativo,
              c.id as curso_id, c.nome as curso_nome, c.imagem_url as curso_imagem,
              c.carga_horaria, c.preco,
              u.id as unidade_id, u.nome as unidade_nome, u.cidade as unidade_cidade,
              u.meta_pixel_id, u.google_analytics_id
       FROM formularios f
       JOIN cursos c ON c.id = f.curso_id
       JOIN unidades u ON u.id = f.unidade_id
       WHERE f.slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    const row = result.rows[0];

    if (!row.ativo) {
      return res.status(410).json({ error: 'Este formulário não está mais ativo' });
    }

    res.json({
      id: row.id,
      slug: row.slug,
      titulo: row.titulo || row.curso_nome,
      descricao: row.descricao,
      curso: {
        id: row.curso_id,
        nome: row.curso_nome,
        imagem_url: row.curso_imagem,
        carga_horaria: row.carga_horaria,
        preco: parseFloat(row.preco)
      },
      unidade: {
        id: row.unidade_id,
        nome: row.unidade_nome,
        cidade: row.unidade_cidade
      },
      tracking: {
        meta_pixel_id: row.meta_pixel_id || null,
        google_analytics_id: row.google_analytics_id || null
      }
    });
  } catch (error) {
    console.error('Error loading public form:', error);
    res.status(500).json({ error: 'Erro ao carregar formulário' });
  }
});

// POST /api/public/forms/:slug/register — register interest
router.post('/:slug/register', async (req, res) => {
  try {
    const { slug } = req.params;
    const { nome, whatsapp, available_periods } = req.body;

    if (!nome || !whatsapp) {
      return res.status(400).json({ error: 'Nome e WhatsApp são obrigatórios' });
    }

    // Get form data
    const formResult = await pool.query(
      `SELECT f.id, f.curso_id, f.unidade_id,
              u.meta_pixel_id, u.meta_capi_token
       FROM formularios f
       JOIN unidades u ON u.id = f.unidade_id
       WHERE f.slug = $1 AND f.ativo = true`,
      [slug]
    );

    if (formResult.rows.length === 0) {
      return res.status(404).json({ error: 'Formulário não encontrado ou inativo' });
    }

    const form = formResult.rows[0];

    // Normalize WhatsApp
    const normalizedWhatsapp = whatsapp.replace(/\D/g, '');

    // Check if aluno already exists by whatsapp + unidade
    let alunoId;
    const existingAluno = await pool.query(
      'SELECT id FROM alunos WHERE whatsapp = $1 AND unidade_id = $2',
      [normalizedWhatsapp, form.unidade_id]
    );

    if (existingAluno.rows.length > 0) {
      alunoId = existingAluno.rows[0].id;
      // Update name and periods if provided
      await pool.query(
        'UPDATE alunos SET nome = $1, available_periods = $2 WHERE id = $3',
        [nome, available_periods && available_periods.length > 0 ? `{${available_periods.join(',')}}` : null, alunoId]
      );
    } else {
      // Create new aluno
      const alunoResult = await pool.query(
        `INSERT INTO alunos (nome, whatsapp, unidade_id, available_periods)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [nome, normalizedWhatsapp, form.unidade_id,
         available_periods && available_periods.length > 0 ? `{${available_periods.join(',')}}` : null]
      );
      alunoId = alunoResult.rows[0].id;
    }

    // Check if interest already exists
    const existingInterest = await pool.query(
      'SELECT id FROM aluno_curso_interests WHERE aluno_id = $1 AND curso_id = $2',
      [alunoId, form.curso_id]
    );

    if (existingInterest.rows.length === 0) {
      // Create interest
      await pool.query(
        `INSERT INTO aluno_curso_interests (aluno_id, curso_id, status)
         VALUES ($1, $2, 'interested')`,
        [alunoId, form.curso_id]
      );
    }

    // Send Meta Conversions API event (server-side)
    const sourceUrl = `${req.protocol}://${req.get('host')}/f/${slug}`;
    await sendMetaConversion({
      pixelId: form.meta_pixel_id,
      accessToken: form.meta_capi_token,
      nome,
      whatsapp: normalizedWhatsapp,
      sourceUrl
    });

    res.status(201).json({
      success: true,
      message: 'Cadastro realizado com sucesso!'
    });
  } catch (error) {
    console.error('Error registering interest:', error);
    res.status(500).json({ error: 'Erro ao realizar cadastro' });
  }
});

export default router;
