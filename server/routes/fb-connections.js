import { Router } from 'express';
import pool from '../db.js';
import { syncConnection } from '../services/auto-sync.js';

const router = Router();

// GET / — List all connections (with curso and unidade names)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*,
             cur.nome AS curso_nome,
             u.nome AS unidade_nome
      FROM fb_import_connections c
      JOIN cursos cur ON cur.id = c.curso_id
      JOIN unidades u ON u.id = c.unidade_id
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error listing fb connections:', error);
    res.status(500).json({ error: 'Erro ao listar conexões' });
  }
});

// POST / — Create new connection
router.post('/', async (req, res) => {
  try {
    const { nome, spreadsheet_url, curso_id, unidade_id } = req.body;

    if (!nome || !spreadsheet_url || !curso_id || !unidade_id) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const { rows } = await pool.query(
      `INSERT INTO fb_import_connections (nome, spreadsheet_url, curso_id, unidade_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nome, spreadsheet_url, curso_id, unidade_id]
    );

    // Fetch with JOINs for response
    const full = await pool.query(`
      SELECT c.*, cur.nome AS curso_nome, u.nome AS unidade_nome
      FROM fb_import_connections c
      JOIN cursos cur ON cur.id = c.curso_id
      JOIN unidades u ON u.id = c.unidade_id
      WHERE c.id = $1
    `, [rows[0].id]);

    res.status(201).json(full.rows[0]);
  } catch (error) {
    console.error('Error creating fb connection:', error);
    res.status(500).json({ error: 'Erro ao criar conexão' });
  }
});

// PUT /:id — Update connection
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, spreadsheet_url, curso_id, unidade_id, ativo } = req.body;

    const { rows } = await pool.query(
      `UPDATE fb_import_connections
       SET nome = COALESCE($2, nome),
           spreadsheet_url = COALESCE($3, spreadsheet_url),
           curso_id = COALESCE($4, curso_id),
           unidade_id = COALESCE($5, unidade_id),
           ativo = COALESCE($6, ativo)
       WHERE id = $1
       RETURNING *`,
      [id, nome, spreadsheet_url, curso_id, unidade_id, ativo]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Conexão não encontrada' });
    }

    // Fetch with JOINs
    const full = await pool.query(`
      SELECT c.*, cur.nome AS curso_nome, u.nome AS unidade_nome
      FROM fb_import_connections c
      JOIN cursos cur ON cur.id = c.curso_id
      JOIN unidades u ON u.id = c.unidade_id
      WHERE c.id = $1
    `, [id]);

    res.json(full.rows[0]);
  } catch (error) {
    console.error('Error updating fb connection:', error);
    res.status(500).json({ error: 'Erro ao atualizar conexão' });
  }
});

// DELETE /:id — Remove connection
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(
      'DELETE FROM fb_import_connections WHERE id = $1',
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Conexão não encontrada' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting fb connection:', error);
    res.status(500).json({ error: 'Erro ao deletar conexão' });
  }
});

// POST /:id/sync — Force sync a specific connection
router.post('/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch connection with JOINs
    const { rows } = await pool.query(`
      SELECT c.*, cur.nome AS curso_nome, u.nome AS unidade_nome
      FROM fb_import_connections c
      JOIN cursos cur ON cur.id = c.curso_id
      JOIN unidades u ON u.id = c.unidade_id
      WHERE c.id = $1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Conexão não encontrada' });
    }

    const result = await syncConnection(rows[0]);

    // Re-fetch updated connection
    const updated = await pool.query(`
      SELECT c.*, cur.nome AS curso_nome, u.nome AS unidade_nome
      FROM fb_import_connections c
      JOIN cursos cur ON cur.id = c.curso_id
      JOIN unidades u ON u.id = c.unidade_id
      WHERE c.id = $1
    `, [id]);

    res.json({
      ...result,
      connection: updated.rows[0]
    });
  } catch (error) {
    console.error('Error syncing fb connection:', error);
    res.status(500).json({ error: 'Erro ao sincronizar' });
  }
});

export default router;
