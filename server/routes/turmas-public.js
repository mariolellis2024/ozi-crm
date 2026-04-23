import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/public/turmas/:slug — public turma data for seat reservation page
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      `SELECT t.id, t.name, t.cadeiras, t.period, t.start_date, t.end_date, t.public_slug,
              t.horario_inicio, t.horario_fim, t.local_aula, t.endereco_aula, t.carga_horaria_total, t.days_of_week,
              c.id as curso_id, c.nome as curso_nome, c.preco as curso_preco, c.carga_horaria,
              c.imagem_url as curso_imagem, c.descricao as curso_descricao, c.trailer_youtube_url, c.vturb_embed_code, c.vturb_speed_code,
              s.nome as sala_nome,
              un.nome as unidade_nome, un.cidade as unidade_cidade
       FROM turmas t
       JOIN cursos c ON c.id = t.curso_id
       LEFT JOIN salas s ON s.id = t.sala_id
       LEFT JOIN unidades un ON un.id = s.unidade_id
       WHERE t.public_slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }

    const row = result.rows[0];

    // Count enrolled + pre_enrolled students
    const countsResult = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM aluno_curso_interests
       WHERE turma_id = $1 AND status IN ('enrolled', 'pre_enrolled')
       GROUP BY status`,
      [row.id]
    );

    let enrolledCount = 0;
    let preEnrolledCount = 0;
    countsResult.rows.forEach(r => {
      if (r.status === 'enrolled') enrolledCount = parseInt(r.count);
      if (r.status === 'pre_enrolled') preEnrolledCount = parseInt(r.count);
    });

    // Load course modules
    const modulosResult = await pool.query(
      'SELECT * FROM curso_modulos WHERE curso_id = $1 ORDER BY ordem ASC',
      [row.curso_id]
    );

    // === Urgency Algorithm ===
    const totalSeats = row.cadeiras;
    const realOccupied = enrolledCount + preEnrolledCount;
    const realFree = totalSeats - realOccupied;

    // Proportional urgency: ~15% of total seats, min 2, max 5
    const urgencyMargin = Math.min(5, Math.max(2, Math.floor(totalSeats * 0.15)));

    let displayedAvailable;
    if (realFree <= 0) {
      displayedAvailable = 0; // SOLD OUT
    } else if (realFree <= urgencyMargin) {
      displayedAvailable = realFree; // Show real count (it's already urgent)
    } else {
      displayedAvailable = urgencyMargin; // Fake urgency
    }

    const displayedOccupied = totalSeats - displayedAvailable;

    // Parse days_of_week
    let daysOfWeek = [];
    if (row.days_of_week) {
      if (Array.isArray(row.days_of_week)) {
        daysOfWeek = row.days_of_week;
      } else if (typeof row.days_of_week === 'string') {
        daysOfWeek = row.days_of_week.replace(/[{}]/g, '').split(',').map(Number).filter(n => !isNaN(n));
      }
    }

    res.json({
      turma: {
        id: row.id,
        name: row.name,
        cadeiras: totalSeats,
        period: row.period,
        start_date: row.start_date instanceof Date ? row.start_date.toISOString().split('T')[0] : row.start_date,
        end_date: row.end_date instanceof Date ? row.end_date.toISOString().split('T')[0] : row.end_date,
        horario_inicio: row.horario_inicio,
        horario_fim: row.horario_fim,
        local_aula: row.local_aula,
        endereco_aula: row.endereco_aula,
        days_of_week: daysOfWeek,
        sala_nome: row.sala_nome,
        unidade_nome: row.unidade_nome,
        unidade_cidade: row.unidade_cidade
      },
      curso: {
        id: row.curso_id,
        nome: row.curso_nome,
        preco: parseFloat(row.curso_preco),
        carga_horaria: row.carga_horaria,
        imagem_url: row.curso_imagem,
        descricao: row.curso_descricao,
        trailer_youtube_url: row.trailer_youtube_url,
        vturb_embed_code: row.vturb_embed_code,
        vturb_speed_code: row.vturb_speed_code
      },
      seats: {
        total: totalSeats,
        displayed_occupied: displayedOccupied,
        displayed_available: displayedAvailable,
        is_sold_out: displayedAvailable <= 0
      },
      modulos: modulosResult.rows
    });
  } catch (error) {
    console.error('Error loading public turma:', error);
    res.status(500).json({ error: 'Erro ao carregar turma' });
  }
});

// POST /api/public/turmas/:slug/reserve — reserve a seat
router.post('/:slug/reserve', async (req, res) => {
  try {
    const { slug } = req.params;
    const { nome, whatsapp, email, seat_number } = req.body;

    if (!nome || !whatsapp) {
      return res.status(400).json({ error: 'Nome e WhatsApp são obrigatórios' });
    }

    // Get turma data
    const turmaResult = await pool.query(
      `SELECT t.id, t.curso_id, t.cadeiras,
              s.unidade_id
       FROM turmas t
       LEFT JOIN salas s ON s.id = t.sala_id
       WHERE t.public_slug = $1`,
      [slug]
    );

    if (turmaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }

    const turma = turmaResult.rows[0];

    // Check if turma is full
    const occupiedResult = await pool.query(
      `SELECT COUNT(*) as count FROM aluno_curso_interests
       WHERE turma_id = $1 AND status IN ('enrolled', 'pre_enrolled')`,
      [turma.id]
    );
    const occupied = parseInt(occupiedResult.rows[0].count);
    if (occupied >= turma.cadeiras) {
      return res.status(409).json({ error: 'Turma lotada! Não há vagas disponíveis.' });
    }

    // Normalize WhatsApp
    const normalizedWhatsapp = whatsapp.replace(/\D/g, '');

    // Find or create aluno
    let alunoId;
    const existingAluno = await pool.query(
      'SELECT id FROM alunos WHERE whatsapp = $1 AND unidade_id = $2',
      [normalizedWhatsapp, turma.unidade_id]
    );

    if (existingAluno.rows.length > 0) {
      alunoId = existingAluno.rows[0].id;
      // Update name and email
      await pool.query(
        'UPDATE alunos SET nome = $1, email = COALESCE($3, email) WHERE id = $2',
        [nome, alunoId, email || null]
      );
    } else {
      const alunoResult = await pool.query(
        'INSERT INTO alunos (nome, whatsapp, unidade_id, email) VALUES ($1, $2, $3, $4) RETURNING id',
        [nome, normalizedWhatsapp, turma.unidade_id, email || null]
      );
      alunoId = alunoResult.rows[0].id;
    }

    // Check if interest already exists
    const existingInterest = await pool.query(
      'SELECT id, status FROM aluno_curso_interests WHERE aluno_id = $1 AND curso_id = $2',
      [alunoId, turma.curso_id]
    );

    if (existingInterest.rows.length > 0) {
      const existing = existingInterest.rows[0];
      if (existing.status === 'enrolled') {
        return res.status(409).json({ error: 'Você já está matriculado neste curso!' });
      }
      if (existing.status === 'pre_enrolled') {
        return res.status(409).json({ error: 'Você já reservou uma vaga neste curso!' });
      }
      // Update existing interest to pre_enrolled
      await pool.query(
        'UPDATE aluno_curso_interests SET status = $1, turma_id = $2 WHERE id = $3',
        ['pre_enrolled', turma.id, existing.id]
      );
    } else {
      // Create new pre-enrolled interest
      await pool.query(
        `INSERT INTO aluno_curso_interests (aluno_id, curso_id, status, turma_id, lead_source)
         VALUES ($1, $2, 'pre_enrolled', $3, 'seat_reservation')`,
        [alunoId, turma.curso_id, turma.id]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Vaga reservada com sucesso!',
      seat_number: seat_number || null
    });
  } catch (error) {
    console.error('Error reserving seat:', error);
    res.status(500).json({ error: 'Erro ao reservar vaga' });
  }
});

export default router;
