import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/unidades
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.*, 
        (SELECT COUNT(*) FROM salas s WHERE s.unidade_id = u.id) as total_salas,
        (SELECT COALESCE(SUM(s.cadeiras), 0) FROM salas s WHERE s.unidade_id = u.id) as total_cadeiras,
        (SELECT COUNT(*) FROM turmas t 
         JOIN salas s ON s.id = t.sala_id 
         WHERE s.unidade_id = u.id) as total_turmas,
        (SELECT COUNT(*) FROM formularios f WHERE f.unidade_id = u.id) as total_formularios
      FROM unidades u 
      ORDER BY u.nome
    `);
    res.json(result.rows.map(u => ({
      ...u,
      horas_disponiveis_dia: parseFloat(u.horas_disponiveis_dia || 0),
      valor_hora_aluno: parseFloat(u.valor_hora_aluno || 0),
      total_cadeiras: parseInt(u.total_cadeiras || 0),
      // Potencial mensal = cadeiras × horas/dia × 22 dias úteis × valor/hora/aluno
      potencial_mensal: parseInt(u.total_cadeiras || 0) * parseFloat(u.horas_disponiveis_dia || 0) * 22 * parseFloat(u.valor_hora_aluno || 0)
    })));
  } catch (error) {
    console.error('Error loading unidades:', error);
    res.status(500).json({ error: 'Erro ao carregar unidades' });
  }
});

// POST /api/unidades
router.post('/', async (req, res) => {
  try {
    const { nome, cidade, endereco, horas_disponiveis_dia, valor_hora_aluno } = req.body;
    const result = await pool.query(
      'INSERT INTO unidades (nome, cidade, endereco, horas_disponiveis_dia, valor_hora_aluno) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nome, cidade || null, endereco || null, parseFloat(horas_disponiveis_dia) || 0, parseFloat(valor_hora_aluno) || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating unidade:', error);
    res.status(500).json({ error: 'Erro ao criar unidade' });
  }
});

// PUT /api/unidades/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cidade, endereco, meta_pixel_id, meta_capi_token, google_analytics_id, horas_disponiveis_dia, valor_hora_aluno } = req.body;
    const result = await pool.query(
      `UPDATE unidades SET nome = $1, cidade = $2, endereco = $3,
       meta_pixel_id = $4, meta_capi_token = $5, google_analytics_id = $6,
       horas_disponiveis_dia = $7, valor_hora_aluno = $8
       WHERE id = $9 RETURNING *`,
      [nome, cidade || null, endereco || null, meta_pixel_id || null, meta_capi_token || null, google_analytics_id || null,
       parseFloat(horas_disponiveis_dia) || 0, parseFloat(valor_hora_aluno) || 0, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unidade não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating unidade:', error);
    res.status(500).json({ error: 'Erro ao atualizar unidade' });
  }
});

// DELETE /api/unidades/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const inUse = await pool.query('SELECT id FROM salas WHERE unidade_id = $1 LIMIT 1', [id]);
    if (inUse.rows.length > 0) {
      return res.status(409).json({ error: 'Unidade possui salas associadas. Remova as salas primeiro.' });
    }
    const result = await pool.query('DELETE FROM unidades WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unidade não encontrada' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting unidade:', error);
    res.status(500).json({ error: 'Erro ao excluir unidade' });
  }
});

// POST /api/unidades/:id/test-capi — send test event to verify Meta pixel + token
router.post('/:id/test-capi', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT nome, meta_pixel_id, meta_capi_token FROM unidades WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Unidade não encontrada' });

    const { nome, meta_pixel_id, meta_capi_token } = result.rows[0];
    if (!meta_pixel_id || !meta_capi_token) {
      return res.status(400).json({ error: 'Pixel ID ou CAPI Token não configurados para esta unidade' });
    }

    const payload = JSON.stringify({
      data: [{
        event_name: 'PageView',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        user_data: { client_ip_address: '127.0.0.1', client_user_agent: 'OZI-CRM-Test' }
      }],
      test_event_code: 'TEST_OZI_CRM'
    });

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${meta_pixel_id}/events?access_token=${meta_capi_token}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }
    );

    const data = await response.json();

    if (response.ok && data.events_received) {
      res.json({ 
        success: true, 
        message: `✅ CAPI OK — ${data.events_received} evento(s) recebido(s) pelo Facebook`,
        pixel_id: meta_pixel_id,
        fbtrace_id: data.fbtrace_id,
        unidade: nome
      });
    } else {
      res.json({ 
        success: false, 
        message: `❌ Erro do Facebook: ${data.error?.message || JSON.stringify(data)}`,
        pixel_id: meta_pixel_id,
        error_code: data.error?.code,
        error_subcode: data.error?.error_subcode,
        unidade: nome
      });
    }
  } catch (error) {
    console.error('Error testing CAPI:', error);
    res.status(500).json({ error: 'Erro ao testar CAPI: ' + error.message });
  }
});

export default router;
