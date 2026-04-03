import { Router } from 'express';
import pool from '../db.js';

const router = Router();

/**
 * Convert a Google Sheets URL to its CSV export URL.
 * Supports:
 *   - https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit...
 *   - https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/pub...
 *   - Direct /export?format=csv links
 */
function toCSVUrl(url) {
  // Already a CSV export link
  if (url.includes('/export') && url.includes('format=csv')) return url;

  // Extract spreadsheet ID
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;

  const spreadsheetId = match[1];

  // Extract gid (sheet tab) if present
  const gidMatch = url.match(/gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

/**
 * Parse CSV text into array of objects.
 * Handles quoted fields with commas inside.
 */
function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Clean Facebook phone format: "p:+5561999646389" → "61999646389"
 */
function cleanPhone(raw) {
  if (!raw) return '';
  // Remove "p:" prefix, "+55" country code, and any non-digits
  let digits = raw.replace(/^p:/, '').replace(/^\+?55/, '').replace(/\D/g, '');
  // Ensure we have at least DDD + number
  if (digits.length > 11) digits = digits.slice(-11);
  return digits;
}

/**
 * Translate platform code to readable source
 */
function platformToSource(platform) {
  const p = (platform || '').toLowerCase();
  if (p === 'ig') return 'instagram';
  if (p === 'fb') return 'facebook';
  return p || 'meta';
}

// POST /api/import-leads/preview — fetch and parse CSV, return preview
router.post('/preview', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL é obrigatória' });

    const csvUrl = toCSVUrl(url);
    if (!csvUrl) return res.status(400).json({ error: 'URL do Google Sheets inválida' });

    const response = await fetch(csvUrl);
    if (!response.ok) {
      return res.status(400).json({ error: 'Não foi possível acessar a planilha. Verifique se ela é pública.' });
    }

    const text = await response.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Planilha vazia ou formato inválido' });
    }

    // Validate required columns
    const firstRow = rows[0];
    const hasRequiredCols = firstRow.nome_completo !== undefined && firstRow.telefone !== undefined;
    if (!hasRequiredCols) {
      return res.status(400).json({
        error: 'Colunas obrigatórias não encontradas. A planilha precisa ter: nome_completo, telefone',
        columns_found: Object.keys(firstRow)
      });
    }

    // Map to preview format
    const leads = rows.map(row => ({
      fb_lead_id: row.id || null,
      nome: row.nome_completo || '',
      email: row.email || '',
      whatsapp: cleanPhone(row.telefone),
      platform: platformToSource(row.platform),
      campaign_name: row.campaign_name || '',
      ad_name: row.ad_name || '',
      adset_name: row.adset_name || '',
      created_time: row.created_time || null,
    }));

    // Check which leads already exist
    const fbIds = leads.map(l => l.fb_lead_id).filter(Boolean);
    let existingFbIds = new Set();
    if (fbIds.length > 0) {
      const existing = await pool.query(
        'SELECT fb_lead_id FROM aluno_curso_interests WHERE fb_lead_id = ANY($1)',
        [fbIds]
      );
      existingFbIds = new Set(existing.rows.map(r => r.fb_lead_id));
    }

    const leadsWithStatus = leads.map(l => ({
      ...l,
      is_duplicate: l.fb_lead_id ? existingFbIds.has(l.fb_lead_id) : false,
    }));

    const newCount = leadsWithStatus.filter(l => !l.is_duplicate).length;
    const dupCount = leadsWithStatus.filter(l => l.is_duplicate).length;

    res.json({
      total: leadsWithStatus.length,
      new_count: newCount,
      duplicate_count: dupCount,
      leads: leadsWithStatus,
    });
  } catch (error) {
    console.error('Error previewing import:', error);
    res.status(500).json({ error: 'Erro ao processar planilha' });
  }
});

// POST /api/import-leads/execute — actually import the leads
router.post('/execute', async (req, res) => {
  try {
    const { leads, curso_id, unidade_id } = req.body;

    if (!leads || !curso_id || !unidade_id) {
      return res.status(400).json({ error: 'leads, curso_id e unidade_id são obrigatórios' });
    }

    let imported = 0;
    let skipped = 0;

    for (const lead of leads) {
      if (lead.is_duplicate) {
        skipped++;
        continue;
      }

      const { fb_lead_id, nome, email, whatsapp, platform, campaign_name, ad_name, adset_name, created_time } = lead;

      if (!nome || !whatsapp) {
        skipped++;
        continue;
      }

      // Check if aluno already exists by whatsapp + unidade
      let alunoId;
      const existingAluno = await pool.query(
        'SELECT id FROM alunos WHERE whatsapp = $1 AND unidade_id = $2',
        [whatsapp, unidade_id]
      );

      if (existingAluno.rows.length > 0) {
        alunoId = existingAluno.rows[0].id;
        // Update email if not set
        if (email) {
          await pool.query(
            'UPDATE alunos SET email = COALESCE(email, $2) WHERE id = $1',
            [alunoId, email]
          );
        }
      } else {
        // Create new aluno
        const alunoResult = await pool.query(
          'INSERT INTO alunos (nome, email, whatsapp, unidade_id) VALUES ($1, $2, $3, $4) RETURNING id',
          [nome, email || null, whatsapp, unidade_id]
        );
        alunoId = alunoResult.rows[0].id;
      }

      // Check if interest already exists (by fb_lead_id or aluno+curso)
      if (fb_lead_id) {
        const existingByFb = await pool.query(
          'SELECT id FROM aluno_curso_interests WHERE fb_lead_id = $1',
          [fb_lead_id]
        );
        if (existingByFb.rows.length > 0) {
          skipped++;
          continue;
        }
      }

      const existingInterest = await pool.query(
        'SELECT id FROM aluno_curso_interests WHERE aluno_id = $1 AND curso_id = $2',
        [alunoId, curso_id]
      );

      if (existingInterest.rows.length > 0) {
        // Update UTMs + fb_lead_id on existing interest if not set
        await pool.query(
          `UPDATE aluno_curso_interests SET
           fb_lead_id = COALESCE(fb_lead_id, $3),
           utm_source = COALESCE(utm_source, $4),
           utm_medium = COALESCE(utm_medium, $5),
           utm_campaign = COALESCE(utm_campaign, $6),
           utm_content = COALESCE(utm_content, $7),
           utm_term = COALESCE(utm_term, $8)
           WHERE aluno_id = $1 AND curso_id = $2`,
          [alunoId, curso_id, fb_lead_id || null,
           platform || null, 'paid', campaign_name || null, ad_name || null, adset_name || null]
        );
        skipped++;
        continue;
      }

      // Create new interest with UTMs and original date
      const createdAt = created_time ? new Date(created_time).toISOString() : new Date().toISOString();

      await pool.query(
        `INSERT INTO aluno_curso_interests
         (aluno_id, curso_id, status, lead_source, fb_lead_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, created_at)
         VALUES ($1, $2, 'interested', 'facebook_form', $3, $4, $5, $6, $7, $8, $9)`,
        [alunoId, curso_id, fb_lead_id || null,
         platform || null, 'paid', campaign_name || null, ad_name || null, adset_name || null,
         createdAt]
      );

      imported++;
    }

    res.json({
      success: true,
      imported,
      skipped,
      total: leads.length,
    });
  } catch (error) {
    console.error('Error executing import:', error);
    res.status(500).json({ error: 'Erro ao importar leads' });
  }
});

export default router;
