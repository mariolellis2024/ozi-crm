import { Router } from 'express';
import pool from '../db.js';
import { sendMetaConversion } from '../services/conversion.js';

const router = Router();

// GET /api/public/landing/:slug — public landing page data
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      `SELECT lp.*,
              c.id as curso_id_ref, c.nome as curso_nome, c.imagem_url as curso_imagem,
              c.carga_horaria, c.preco,
              u.id as unidade_id_ref, u.nome as unidade_nome, u.cidade as unidade_cidade,
              u.meta_pixel_id, u.google_analytics_id,
              spg.nome as social_proof_group_nome
       FROM landing_pages lp
       JOIN cursos c ON c.id = lp.curso_id
       JOIN unidades u ON u.id = lp.unidade_id
       LEFT JOIN social_proof_groups spg ON spg.id = lp.social_proof_group_id
       WHERE lp.slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Landing page não encontrada' });
    }

    const row = result.rows[0];

    if (!row.ativo) {
      return res.status(410).json({ error: 'Esta landing page não está mais ativa' });
    }

    // Track visit (fire-and-forget)
    const visitorIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                    || req.headers['x-real-ip']
                    || req.socket?.remoteAddress
                    || '';
    pool.query(
      'INSERT INTO landing_page_visits (landing_page_id, visitor_ip) VALUES ($1, $2)',
      [row.id, visitorIp]
    ).catch(err => console.error('Error tracking LP visit:', err));

    // Fetch modules + social proof in parallel
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
      hero: {
        headline: row.hero_headline,
        subheadline: row.hero_subheadline,
        image_url: row.hero_image_url
      },
      para_quem: {
        headline: row.para_quem_headline,
        texto: row.para_quem_texto,
        sem_curso_items: typeof row.sem_curso_items === 'string' ? JSON.parse(row.sem_curso_items) : (row.sem_curso_items || []),
        com_curso_items: typeof row.com_curso_items === 'string' ? JSON.parse(row.com_curso_items) : (row.com_curso_items || [])
      },
      bonus: {
        titulo: row.bonus_titulo,
        descricao: row.bonus_descricao,
        entrega: row.bonus_entrega,
        image_url: row.bonus_image_url
      },
      investimento: {
        headline: row.investimento_headline,
        descricao: row.investimento_descricao,
        parcelas: row.preco_parcelas || 12,
        valor_parcela: row.preco_valor_parcela ? parseFloat(row.preco_valor_parcela) : null,
        desconto: row.preco_desconto,
        items: typeof row.investimento_items === 'string' ? JSON.parse(row.investimento_items) : (row.investimento_items || [])
      },
      social_proof: {
        headline1: row.social_proof_headline1,
        headline2: row.social_proof_headline2,
        items: socialProofResult?.rows || []
      },
      modulos: modulosResult.rows,
      tracking: {
        meta_pixel_id: row.meta_pixel_id || null,
        google_analytics_id: row.google_analytics_id || null
      }
    });
  } catch (error) {
    console.error('Error loading public landing page:', error);
    res.status(500).json({ error: 'Erro ao carregar landing page' });
  }
});

// POST /api/public/landing/:slug/register — register interest
router.post('/:slug/register', async (req, res) => {
  try {
    const { slug } = req.params;
    const { nome, whatsapp, available_periods, email, fbc, fbp, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = req.body;

    if (!nome || !whatsapp) {
      return res.status(400).json({ error: 'Nome e WhatsApp são obrigatórios' });
    }

    // Get LP data
    const lpResult = await pool.query(
      `SELECT lp.id, lp.curso_id, lp.unidade_id,
              u.meta_pixel_id, u.meta_capi_token, u.cidade as unidade_cidade
       FROM landing_pages lp
       JOIN unidades u ON u.id = lp.unidade_id
       WHERE lp.slug = $1 AND lp.ativo = true`,
      [slug]
    );

    if (lpResult.rows.length === 0) {
      return res.status(404).json({ error: 'Landing page não encontrada ou inativa' });
    }

    const lp = lpResult.rows[0];
    const normalizedWhatsapp = whatsapp.replace(/\D/g, '');

    // Check if aluno already exists
    let alunoId;
    const existingAluno = await pool.query(
      'SELECT id FROM alunos WHERE whatsapp = $1 AND unidade_id = $2',
      [normalizedWhatsapp, lp.unidade_id]
    );

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                  || req.headers['x-real-ip']
                  || req.socket?.remoteAddress
                  || '';
    const clientUserAgent = req.headers['user-agent'] || '';

    if (existingAluno.rows.length > 0) {
      alunoId = existingAluno.rows[0].id;
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
      const alunoResult = await pool.query(
        `INSERT INTO alunos (nome, whatsapp, unidade_id, available_periods, email, meta_fbc, meta_fbp, meta_client_ip, meta_user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [nome, normalizedWhatsapp, lp.unidade_id,
         available_periods && available_periods.length > 0 ? `{${available_periods.join(',')}}` : null,
         email || null, fbc || null, fbp || null, clientIp || null, clientUserAgent || null]
      );
      alunoId = alunoResult.rows[0].id;
    }

    // Check if interest already exists
    const existingInterest = await pool.query(
      'SELECT id FROM aluno_curso_interests WHERE aluno_id = $1 AND curso_id = $2',
      [alunoId, lp.curso_id]
    );

    if (existingInterest.rows.length === 0) {
      await pool.query(
        `INSERT INTO aluno_curso_interests (aluno_id, curso_id, status, landing_page_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term)
         VALUES ($1, $2, 'interested', $3, $4, $5, $6, $7, $8)`,
        [alunoId, lp.curso_id, lp.id, utm_source || null, utm_medium || null, utm_campaign || null, utm_content || null, utm_term || null]
      );
    } else {
      // Update UTMs only if not already set (preserve original attribution)
      await pool.query(
        `UPDATE aluno_curso_interests SET
         utm_source = COALESCE(utm_source, $3),
         utm_medium = COALESCE(utm_medium, $4),
         utm_campaign = COALESCE(utm_campaign, $5),
         utm_content = COALESCE(utm_content, $6),
         utm_term = COALESCE(utm_term, $7)
         WHERE aluno_id = $1 AND curso_id = $2`,
        [alunoId, lp.curso_id, utm_source || null, utm_medium || null, utm_campaign || null, utm_content || null, utm_term || null]
      );
    }

    // Meta CAPI
    const sourceUrl = `${req.protocol}://${req.get('host')}/lp/${slug}`;
    const cidadeParts = (lp.unidade_cidade || '').split(' - ');
    const cidade = cidadeParts[0]?.trim() || '';
    const estado = cidadeParts[1]?.trim() || '';
    const eventId = `lead_${alunoId}_${lp.curso_id}_${Date.now()}`;

    await sendMetaConversion({
      pixelId: lp.meta_pixel_id,
      accessToken: lp.meta_capi_token,
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
    console.error('Error registering via landing page:', error);
    res.status(500).json({ error: 'Erro ao realizar cadastro' });
  }
});

export default router;
