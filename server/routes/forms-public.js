import { Router } from 'express';
import pool, { parsePgArray } from '../db.js';
import { sendMetaConversion } from '../services/conversion.js';

const router = Router();

// GET /api/public/forms/:slug — public form data
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      `SELECT f.id, f.slug, f.titulo, f.descricao, f.ativo, f.social_proof_group_id,
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

    // Track visit (fire-and-forget, don't block response)
    const visitorIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                    || req.headers['x-real-ip']
                    || req.socket?.remoteAddress
                    || '';
    pool.query(
      'INSERT INTO form_visits (formulario_id, visitor_ip) VALUES ($1, $2)',
      [row.id, visitorIp]
    ).catch(err => console.error('Error tracking form visit:', err));

    // Fetch social proof (from linked group) and course modules in parallel
    const queries = [
      pool.query('SELECT * FROM curso_modulos WHERE curso_id = $1 ORDER BY ordem ASC', [row.curso_id])
    ];
    if (row.social_proof_group_id) {
      queries.push(
        pool.query('SELECT * FROM social_proof_items WHERE group_id = $1 ORDER BY ordem ASC', [row.social_proof_group_id])
      );
    }
    const [modulosResult, socialProofResult] = await Promise.all(queries);

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
      },
      social_proof: socialProofResult?.rows || [],
      modulos: modulosResult.rows
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
    const { nome, whatsapp, available_periods, email, fbc, fbp } = req.body;

    if (!nome || !whatsapp) {
      return res.status(400).json({ error: 'Nome e WhatsApp são obrigatórios' });
    }

    // Get form data
    const formResult = await pool.query(
      `SELECT f.id, f.curso_id, f.unidade_id,
              u.meta_pixel_id, u.meta_capi_token, u.cidade as unidade_cidade
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

    // Capture tracking data early (needed for both DB storage and CAPI)
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                  || req.headers['x-real-ip']
                  || req.socket?.remoteAddress
                  || '';
    const clientUserAgent = req.headers['user-agent'] || '';

    if (existingAluno.rows.length > 0) {
      alunoId = existingAluno.rows[0].id;
      // Update name, periods, email, and tracking data
      await pool.query(
        `UPDATE alunos SET nome = $1, available_periods = $2,
         email = COALESCE($4, email),
         meta_fbc = COALESCE($5, meta_fbc), meta_fbp = COALESCE($6, meta_fbp),
         meta_client_ip = COALESCE($7, meta_client_ip), meta_user_agent = COALESCE($8, meta_user_agent)
         WHERE id = $3`,
        [nome, available_periods && available_periods.length > 0 ? `{${available_periods.join(',')}}` : null,
         alunoId, email || null, fbc || null, fbp || null, clientIp || null, clientUserAgent || null]
      );
    } else {
      // Create new aluno with email and tracking data
      const alunoResult = await pool.query(
        `INSERT INTO alunos (nome, whatsapp, unidade_id, available_periods, email, meta_fbc, meta_fbp, meta_client_ip, meta_user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [nome, normalizedWhatsapp, form.unidade_id,
         available_periods && available_periods.length > 0 ? `{${available_periods.join(',')}}` : null,
         email || null, fbc || null, fbp || null, clientIp || null, clientUserAgent || null]
      );
      alunoId = alunoResult.rows[0].id;
    }

    // Check if interest already exists
    const existingInterest = await pool.query(
      'SELECT id FROM aluno_curso_interests WHERE aluno_id = $1 AND curso_id = $2',
      [alunoId, form.curso_id]
    );

    if (existingInterest.rows.length === 0) {
      // Create interest linked to the source form
      await pool.query(
        `INSERT INTO aluno_curso_interests (aluno_id, curso_id, status, formulario_id)
         VALUES ($1, $2, 'interested', $3)`,
        [alunoId, form.curso_id, form.id]
      );
    }

    // === Meta Conversions API — Maximum Event Match Quality ===
    const sourceUrl = `${req.protocol}://${req.get('host')}/f/${slug}`;
    
    // Extract city and state from unidade_cidade
    const cidadeParts = (form.unidade_cidade || '').split(' - ');
    const cidade = cidadeParts[0]?.trim() || '';
    const estado = cidadeParts[1]?.trim() || '';

    // Generate unique event ID for deduplication
    const eventId = `lead_${alunoId}_${form.curso_id}_${Date.now()}`;

    await sendMetaConversion({
      pixelId: form.meta_pixel_id,
      accessToken: form.meta_capi_token,
      nome,
      whatsapp: normalizedWhatsapp,
      email: email || '',
      cidade,
      estado,
      sourceUrl,
      clientIp,
      clientUserAgent,
      fbc: fbc || '',
      fbp: fbp || '',
      externalId: alunoId,
      eventId
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
