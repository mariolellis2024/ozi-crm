import pool from '../db.js';
import { toCSVUrl, parseCSV, cleanPhone, platformToSource } from '../routes/import-leads.js';

/**
 * Sync a single Facebook import connection.
 * Fetches the spreadsheet, deduplicates, and imports new leads.
 * Returns { imported, skipped, total, error? }
 */
export async function syncConnection(connection) {
  const { id, spreadsheet_url, curso_id, unidade_id, nome } = connection;

  try {
    // 1. Convert URL to CSV export URL
    const csvUrl = toCSVUrl(spreadsheet_url);
    if (!csvUrl) {
      const error = 'URL do Google Sheets inválida';
      await updateSyncStatus(id, 0, error);
      return { imported: 0, skipped: 0, total: 0, error };
    }

    // 2. Fetch spreadsheet
    const response = await fetch(csvUrl);
    if (!response.ok) {
      const error = `Não foi possível acessar a planilha (HTTP ${response.status})`;
      await updateSyncStatus(id, 0, error);
      return { imported: 0, skipped: 0, total: 0, error };
    }

    const text = await response.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      await updateSyncStatus(id, 0, null);
      return { imported: 0, skipped: 0, total: 0 };
    }

    // 3. Validate columns
    const firstRow = rows[0];
    if (firstRow.nome_completo === undefined || firstRow.telefone === undefined) {
      const error = 'Colunas obrigatórias não encontradas (nome_completo, telefone)';
      await updateSyncStatus(id, 0, error);
      return { imported: 0, skipped: 0, total: 0, error };
    }

    // 4. Map rows to lead objects
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

    // 5. Check which leads already exist (deduplicate by fb_lead_id)
    const fbIds = leads.map(l => l.fb_lead_id).filter(Boolean);
    let existingFbIds = new Set();
    if (fbIds.length > 0) {
      const existing = await pool.query(
        'SELECT fb_lead_id FROM aluno_curso_interests WHERE fb_lead_id = ANY($1)',
        [fbIds]
      );
      existingFbIds = new Set(existing.rows.map(r => r.fb_lead_id));
    }

    // 6. Import new leads (same logic as import-leads.js /execute)
    let imported = 0;
    let skipped = 0;

    for (const lead of leads) {
      // Skip duplicates by fb_lead_id
      if (lead.fb_lead_id && existingFbIds.has(lead.fb_lead_id)) {
        skipped++;
        continue;
      }

      const { fb_lead_id, nome: leadNome, email, whatsapp, platform, campaign_name, ad_name, adset_name, created_time } = lead;

      if (!leadNome || !whatsapp) {
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
        if (email) {
          await pool.query(
            'UPDATE alunos SET email = COALESCE(email, $2) WHERE id = $1',
            [alunoId, email]
          );
        }
      } else {
        const alunoResult = await pool.query(
          'INSERT INTO alunos (nome, email, whatsapp, unidade_id) VALUES ($1, $2, $3, $4) RETURNING id',
          [leadNome, email || null, whatsapp, unidade_id]
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

    // 7. Update sync status
    await updateSyncStatus(id, imported, null);

    if (imported > 0) {
      console.log(`  🟢 [${nome}] ${imported} novos leads importados (${skipped} ignorados)`);
    } else {
      console.log(`  ⚪ [${nome}] Nenhum lead novo (${skipped} já existentes)`);
    }

    return { imported, skipped, total: leads.length };
  } catch (error) {
    const msg = error.message || 'Erro desconhecido';
    console.error(`  🔴 [${nome}] Erro: ${msg}`);
    await updateSyncStatus(id, 0, msg);
    return { imported: 0, skipped: 0, total: 0, error: msg };
  }
}

/**
 * Update the sync status of a connection.
 */
async function updateSyncStatus(connectionId, count, error) {
  await pool.query(
    `UPDATE fb_import_connections
     SET last_sync_at = NOW(),
         last_sync_count = $2,
         last_sync_error = $3
     WHERE id = $1`,
    [connectionId, count, error || null]
  );
}

/**
 * Run auto-sync for all active connections.
 */
export async function runAutoSync() {
  try {
    const { rows: connections } = await pool.query(
      `SELECT c.*, cur.nome AS curso_nome, u.nome AS unidade_nome
       FROM fb_import_connections c
       JOIN cursos cur ON cur.id = c.curso_id
       JOIN unidades u ON u.id = c.unidade_id
       WHERE c.ativo = true`
    );

    if (connections.length === 0) return;

    console.log(`\n🔄 Auto-sync Facebook: ${connections.length} conexão(ões) ativa(s)`);

    let totalImported = 0;
    for (const conn of connections) {
      const result = await syncConnection(conn);
      totalImported += result.imported;
    }

    if (totalImported > 0) {
      console.log(`✅ Auto-sync concluído: ${totalImported} lead(s) importado(s)\n`);
    } else {
      console.log(`✅ Auto-sync concluído: sem leads novos\n`);
    }
  } catch (error) {
    console.error('❌ Erro no auto-sync:', error.message);
  }
}

/**
 * Start the auto-sync cron job (runs every 30 minutes).
 */
export function startAutoSync() {
  const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

  console.log('⏰ Auto-sync Facebook ativado (a cada 30 min)');

  // Run once on startup after a short delay
  setTimeout(() => {
    runAutoSync();
  }, 10000); // 10s after startup

  // Then every 30 minutes
  setInterval(() => {
    runAutoSync();
  }, INTERVAL_MS);
}
