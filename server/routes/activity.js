import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/activity — list activity logs
router.get('/', async (req, res) => {
  try {
    const { entity_type, limit = 50, offset = 0 } = req.query;
    
    let query = `SELECT * FROM activity_logs`;
    const params = [];
    
    if (entity_type) {
      params.push(entity_type);
      query += ` WHERE entity_type = $${params.length}`;
    }
    
    query += ` ORDER BY created_at DESC`;
    params.push(parseInt(limit));
    query += ` LIMIT $${params.length}`;
    params.push(parseInt(offset));
    query += ` OFFSET $${params.length}`;
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM activity_logs`;
    const countParams = [];
    if (entity_type) {
      countParams.push(entity_type);
      countQuery += ` WHERE entity_type = $1`;
    }
    const countResult = await pool.query(countQuery, countParams);
    
    res.json({
      data: result.rows,
      count: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error loading activity logs:', error);
    res.status(500).json({ error: 'Erro ao carregar log de atividades' });
  }
});

export default router;
