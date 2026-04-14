import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/cursos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.nome, c.carga_horaria, c.preco, c.categoria_id, c.imagem_url, c.trailer_youtube_url, c.created_at,
              cat.nome as categoria_nome
       FROM cursos c
       LEFT JOIN categorias cat ON cat.id = c.categoria_id
       ORDER BY c.created_at DESC`
    );

    // Get interest counts
    const interestsResult = await pool.query(
      `SELECT curso_id, COUNT(*) as count
       FROM aluno_curso_interests WHERE status = 'interested'
       GROUP BY curso_id`
    );

    const interestCounts = {};
    interestsResult.rows.forEach(r => {
      interestCounts[r.curso_id] = parseInt(r.count);
    });

    const cursos = result.rows.map(c => ({
      id: c.id,
      nome: c.nome,
      carga_horaria: c.carga_horaria,
      preco: parseFloat(c.preco),
      categoria_id: c.categoria_id,
      imagem_url: c.imagem_url,
      trailer_youtube_url: c.trailer_youtube_url,
      descricao: c.descricao,
      modulos: c.modulos,
      created_at: c.created_at,
      categoria: c.categoria_nome ? { nome: c.categoria_nome } : null,
      interested_students_count: interestCounts[c.id] || 0
    }));

    res.json(cursos);
  } catch (error) {
    console.error('Error loading cursos:', error);
    res.status(500).json({ error: 'Erro ao carregar cursos' });
  }
});

// GET /api/cursos/simple — simplified list for selects
router.get('/simple', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nome, preco, carga_horaria FROM cursos ORDER BY nome'
    );
    res.json(result.rows.map(r => ({ ...r, preco: parseFloat(r.preco) })));
  } catch (error) {
    console.error('Error loading cursos:', error);
    res.status(500).json({ error: 'Erro ao carregar cursos' });
  }
});

// POST /api/cursos
router.post('/', async (req, res) => {
  try {
    const { nome, carga_horaria, preco, categoria_id, imagem_url, descricao, modulos, trailer_youtube_url } = req.body;
    const result = await pool.query(
      `INSERT INTO cursos (nome, carga_horaria, preco, categoria_id, imagem_url, descricao, modulos, trailer_youtube_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [nome, parseInt(carga_horaria), parseFloat(preco), categoria_id || null, imagem_url || null, descricao || null, modulos || null, trailer_youtube_url || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating curso:', error);
    res.status(500).json({ error: 'Erro ao criar curso' });
  }
});

// PUT /api/cursos/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, carga_horaria, preco, categoria_id, imagem_url, descricao, modulos, trailer_youtube_url } = req.body;
    const result = await pool.query(
      `UPDATE cursos SET nome = $1, carga_horaria = $2, preco = $3, categoria_id = $4, imagem_url = $5, descricao = $6, modulos = $7, trailer_youtube_url = $8
       WHERE id = $9 RETURNING *`,
      [nome, parseInt(carga_horaria), parseFloat(preco), categoria_id || null, imagem_url || null, descricao || null, modulos || null, trailer_youtube_url || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Update turma names
    const turmas = await pool.query('SELECT id, name FROM turmas WHERE curso_id = $1', [id]);
    for (const turma of turmas.rows) {
      const currentNumber = turma.name.split(' ').pop();
      const newName = `${nome} ${currentNumber}`;
      await pool.query('UPDATE turmas SET name = $1 WHERE id = $2', [newName, turma.id]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating curso:', error);
    res.status(500).json({ error: 'Erro ao atualizar curso' });
  }
});

// DELETE /api/cursos/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM cursos WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting curso:', error);
    res.status(500).json({ error: 'Erro ao excluir curso' });
  }
});

// =====================================================
// Módulos do Curso
// =====================================================

// GET /api/cursos/:cursoId/modulos — list modules for a course
router.get('/:cursoId/modulos', async (req, res) => {
  try {
    const { cursoId } = req.params;
    const result = await pool.query(
      'SELECT * FROM curso_modulos WHERE curso_id = $1 ORDER BY ordem ASC, created_at ASC',
      [cursoId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error loading modules:', error);
    res.status(500).json({ error: 'Erro ao carregar módulos' });
  }
});

// PUT /api/cursos/:cursoId/modulos — batch update all modules (replace all)
router.put('/:cursoId/modulos', async (req, res) => {
  try {
    const { cursoId } = req.params;
    const { modulos } = req.body;

    // Delete existing modules
    await pool.query('DELETE FROM curso_modulos WHERE curso_id = $1', [cursoId]);

    // Insert new ones
    if (modulos && modulos.length > 0) {
      for (let i = 0; i < modulos.length; i++) {
        const m = modulos[i];
        await pool.query(
          `INSERT INTO curso_modulos (curso_id, titulo, descricao, duracao_horas, icone, entrega, semana, ordem)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [cursoId, m.titulo, m.descricao || null, parseFloat(m.duracao_horas) || 0, m.icone || '📚', m.entrega || null, m.semana || null, i]
        );
      }
    }

    // Return updated list
    const result = await pool.query(
      'SELECT * FROM curso_modulos WHERE curso_id = $1 ORDER BY ordem ASC',
      [cursoId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error saving modules:', error);
    res.status(500).json({ error: 'Erro ao salvar módulos' });
  }
});

export default router;
