import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';

const router = Router();

// GET /api/users — list all users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error loading users:', error);
    res.status(500).json({ error: 'Erro ao carregar usuários' });
  }
});

// POST /api/users — create user (admin only)
router.post('/', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, created_at',
      [email, password_hash, full_name || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// PUT /api/users/:id — update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Check for duplicate email
    const existing = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email já cadastrado por outro usuário' });
    }

    let result;
    if (password && password.length >= 6) {
      const password_hash = await bcrypt.hash(password, 10);
      result = await pool.query(
        'UPDATE users SET email = $1, full_name = $2, password_hash = $3 WHERE id = $4 RETURNING id, email, full_name, created_at',
        [email, full_name || null, password_hash, id]
      );
    } else {
      result = await pool.query(
        'UPDATE users SET email = $1, full_name = $2 WHERE id = $3 RETURNING id, email, full_name, created_at',
        [email, full_name || null, id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// DELETE /api/users/:id — delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (req.user && req.user.id === id) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

export default router;
