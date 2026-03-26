import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/pipeline — all interests with student/course info for kanban
router.get('/', async (req, res) => {
  try {
    const { unidade_id } = req.query;
    const whereClause = unidade_id ? 'WHERE a.unidade_id = $1' : '';
    const params = unidade_id ? [unidade_id] : [];
    
    const result = await pool.query(`
      SELECT 
        aci.id, aci.aluno_id, aci.curso_id, aci.status, aci.turma_id, aci.created_at,
        a.nome as aluno_nome, a.email as aluno_email, a.whatsapp as aluno_whatsapp,
        c.nome as curso_nome,
        u.nome as unidade_nome
      FROM aluno_curso_interests aci
      JOIN alunos a ON a.id = aci.aluno_id
      JOIN cursos c ON c.id = aci.curso_id
      LEFT JOIN unidades u ON u.id = a.unidade_id
      ${whereClause}
      ORDER BY aci.created_at DESC
    `, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error loading pipeline:', error);
    res.status(500).json({ error: 'Erro ao carregar pipeline' });
  }
});

export default router;
