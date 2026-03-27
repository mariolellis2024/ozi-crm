import { Router } from 'express';
import pool from '../db.js';

const router = Router();

const META_GRAPH_API = 'https://graph.facebook.com/v21.0';

/**
 * GET /api/facebook-ads/campaigns
 * Pull campaign insights from Facebook Marketing API
 * Requires: unidade with meta_ad_account_id and meta_capi_token
 */
router.get('/campaigns', async (req, res) => {
  try {
    const { unidade_id, date_preset } = req.query;

    // Get all unidades with ad accounts configured
    let unidades;
    if (unidade_id) {
      const result = await pool.query(
        'SELECT id, nome, meta_ad_account_id, meta_capi_token FROM unidades WHERE id = $1 AND meta_ad_account_id IS NOT NULL',
        [unidade_id]
      );
      unidades = result.rows;
    } else {
      const result = await pool.query(
        'SELECT id, nome, meta_ad_account_id, meta_capi_token FROM unidades WHERE meta_ad_account_id IS NOT NULL'
      );
      unidades = result.rows;
    }

    if (unidades.length === 0) {
      return res.json([]);
    }

    const allCampaigns = [];

    for (const unidade of unidades) {
      try {
        const adAccountId = unidade.meta_ad_account_id.startsWith('act_') 
          ? unidade.meta_ad_account_id 
          : `act_${unidade.meta_ad_account_id}`;

        const preset = date_preset || 'last_30d';
        const url = `${META_GRAPH_API}/${adAccountId}/insights?fields=campaign_name,campaign_id,spend,impressions,clicks,cpc,cpm,ctr,actions,cost_per_action_type&level=campaign&date_preset=${preset}&limit=50&access_token=${unidade.meta_capi_token}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
          console.error(`Facebook Ads API error for ${unidade.nome}:`, data.error.message);
          continue;
        }

        if (data.data) {
          for (const row of data.data) {
            // Extract lead and purchase actions
            const leads = row.actions?.find(a => a.action_type === 'lead')?.value || 0;
            const purchases = row.actions?.find(a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0;
            const cpl = row.cost_per_action_type?.find(a => a.action_type === 'lead')?.value || null;

            allCampaigns.push({
              unidade: unidade.nome,
              unidade_id: unidade.id,
              campaign_name: row.campaign_name,
              campaign_id: row.campaign_id,
              spend: parseFloat(row.spend || 0),
              impressions: parseInt(row.impressions || 0),
              clicks: parseInt(row.clicks || 0),
              cpc: parseFloat(row.cpc || 0),
              cpm: parseFloat(row.cpm || 0),
              ctr: parseFloat(row.ctr || 0),
              leads: parseInt(leads),
              purchases: parseInt(purchases),
              cpl: cpl ? parseFloat(cpl) : null
            });
          }
        }
      } catch (err) {
        console.error(`Error fetching ads for ${unidade.nome}:`, err.message);
      }
    }

    // Sort by spend descending
    allCampaigns.sort((a, b) => b.spend - a.spend);
    res.json(allCampaigns);
  } catch (error) {
    console.error('Error loading Facebook Ads data:', error);
    res.status(500).json({ error: 'Erro ao carregar dados do Facebook Ads' });
  }
});

/**
 * GET /api/facebook-ads/summary
 * Aggregated summary: total spend, total leads, CPL, ROAS
 */
router.get('/summary', async (req, res) => {
  try {
    const { unidade_id, date_preset } = req.query;

    let unidades;
    if (unidade_id) {
      const result = await pool.query(
        'SELECT id, nome, meta_ad_account_id, meta_capi_token FROM unidades WHERE id = $1 AND meta_ad_account_id IS NOT NULL',
        [unidade_id]
      );
      unidades = result.rows;
    } else {
      const result = await pool.query(
        'SELECT id, nome, meta_ad_account_id, meta_capi_token FROM unidades WHERE meta_ad_account_id IS NOT NULL'
      );
      unidades = result.rows;
    }

    if (unidades.length === 0) {
      return res.json({ totalSpend: 0, totalLeads: 0, totalPurchases: 0, cpl: 0, configured: false });
    }

    let totalSpend = 0, totalLeads = 0, totalPurchases = 0, totalImpressions = 0, totalClicks = 0;

    for (const unidade of unidades) {
      try {
        const adAccountId = unidade.meta_ad_account_id.startsWith('act_') 
          ? unidade.meta_ad_account_id 
          : `act_${unidade.meta_ad_account_id}`;

        const preset = date_preset || 'last_30d';
        const url = `${META_GRAPH_API}/${adAccountId}/insights?fields=spend,impressions,clicks,actions&date_preset=${preset}&access_token=${unidade.meta_capi_token}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.data && data.data[0]) {
          const row = data.data[0];
          totalSpend += parseFloat(row.spend || 0);
          totalImpressions += parseInt(row.impressions || 0);
          totalClicks += parseInt(row.clicks || 0);
          totalLeads += parseInt(row.actions?.find(a => a.action_type === 'lead')?.value || 0);
          totalPurchases += parseInt(row.actions?.find(a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0);
        }
      } catch (err) {
        console.error(`Error fetching summary for ${unidade.nome}:`, err.message);
      }
    }

    // Get revenue from enrolled students (from DB)
    const revenueResult = await pool.query(`
      SELECT COALESCE(SUM(c.preco), 0) as total_revenue
      FROM aluno_curso_interests aci
      JOIN cursos c ON c.id = aci.curso_id
      WHERE aci.status = 'enrolled'
      ${unidade_id ? 'AND aci.aluno_id IN (SELECT id FROM alunos WHERE unidade_id = $1)' : ''}
    `, unidade_id ? [unidade_id] : []);

    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue);

    res.json({
      configured: true,
      totalSpend,
      totalLeads,
      totalPurchases,
      totalImpressions,
      totalClicks,
      totalRevenue,
      cpl: totalLeads > 0 ? totalSpend / totalLeads : 0,
      roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0
    });
  } catch (error) {
    console.error('Error loading Facebook Ads summary:', error);
    res.status(500).json({ error: 'Erro ao carregar resumo do Facebook Ads' });
  }
});

export default router;
