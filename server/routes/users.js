import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { logActivity } from '../activityLog.js';

const router = Router();

const SUPER_ADMIN_EMAIL = 'mario@ozi.com.br';

// GET /api/users — list all users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, is_blocked, is_super_admin, created_at FROM users ORDER BY created_at DESC'
    );
    
    // Load unidade assignments for all users
    const unidadesResult = await pool.query(
      `SELECT uu.user_id, uu.unidade_id, u.nome as unidade_nome
       FROM user_unidades uu
       JOIN unidades u ON u.id = uu.unidade_id`
    );
    
    const unidadesByUser = {};
    unidadesResult.rows.forEach(row => {
      if (!unidadesByUser[row.user_id]) unidadesByUser[row.user_id] = [];
      unidadesByUser[row.user_id].push({ id: row.unidade_id, nome: row.unidade_nome });
    });
    
    const users = result.rows.map(u => ({
      ...u,
      unidades: unidadesByUser[u.id] || []
    }));
    
    res.json(users);
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
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, is_blocked, is_super_admin, created_at',
      [email, password_hash, full_name || null]
    );

    const newUser = result.rows[0];
    
    // Assign unidades if provided
    const { unidade_ids } = req.body;
    if (unidade_ids && unidade_ids.length > 0) {
      for (const unidadeId of unidade_ids) {
        await pool.query(
          'INSERT INTO user_unidades (user_id, unidade_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [newUser.id, unidadeId]
        );
      }
    }
    
    logActivity({
      userId: req.user?.id, userEmail: req.user?.email,
      action: 'create', entityType: 'user',
      entityId: newUser.id, entityName: email
    });
    res.status(201).json({ ...newUser, unidades: [] });
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

    // Protect super admin email change
    const currentUser = await pool.query('SELECT email, is_super_admin FROM users WHERE id = $1', [id]);
    if (currentUser.rows.length > 0 && currentUser.rows[0].is_super_admin && email !== currentUser.rows[0].email) {
      return res.status(403).json({ error: 'Não é possível alterar o email do super administrador' });
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
        'UPDATE users SET email = $1, full_name = $2, password_hash = $3 WHERE id = $4 RETURNING id, email, full_name, is_blocked, is_super_admin, created_at',
        [email, full_name || null, password_hash, id]
      );
    } else {
      result = await pool.query(
        'UPDATE users SET email = $1, full_name = $2 WHERE id = $3 RETURNING id, email, full_name, is_blocked, is_super_admin, created_at',
        [email, full_name || null, id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Update unidades if provided
    const { unidade_ids } = req.body;
    if (unidade_ids !== undefined) {
      await pool.query('DELETE FROM user_unidades WHERE user_id = $1', [id]);
      if (unidade_ids && unidade_ids.length > 0) {
        for (const unidadeId of unidade_ids) {
          await pool.query(
            'INSERT INTO user_unidades (user_id, unidade_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [id, unidadeId]
          );
        }
      }
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// PUT /api/users/:id/block — toggle block status
router.put('/:id/block', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if target is super admin
    const target = await pool.query('SELECT email, is_super_admin FROM users WHERE id = $1', [id]);
    if (target.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    if (target.rows[0].is_super_admin) {
      return res.status(403).json({ error: 'O super administrador não pode ser bloqueado' });
    }

    const result = await pool.query(
      'UPDATE users SET is_blocked = NOT is_blocked WHERE id = $1 RETURNING id, email, full_name, is_blocked, is_super_admin, created_at',
      [id]
    );

    const action = result.rows[0].is_blocked ? 'block' : 'unblock';
    logActivity({
      userId: req.user?.id, userEmail: req.user?.email,
      action, entityType: 'user',
      entityId: id, entityName: target.rows[0].email
    });
    const actionLabel = result.rows[0].is_blocked ? 'bloqueado' : 'desbloqueado';
    res.json({ ...result.rows[0], message: `Usuário ${actionLabel} com sucesso` });
  } catch (error) {
    console.error('Error toggling block:', error);
    res.status(500).json({ error: 'Erro ao alterar bloqueio' });
  }
});

// DELETE /api/users/:id — delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if target is super admin
    const target = await pool.query('SELECT email, is_super_admin FROM users WHERE id = $1', [id]);
    if (target.rows.length > 0 && target.rows[0].is_super_admin) {
      return res.status(403).json({ error: 'O super administrador não pode ser excluído' });
    }

    // Prevent deleting yourself
    if (req.user && req.user.id === id) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json({ success: true });
    logActivity({
      userId: req.user?.id, userEmail: req.user?.email,
      action: 'delete', entityType: 'user',
      entityId: id, entityName: target.rows[0].email
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

export default router;
