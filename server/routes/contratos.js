import { Router } from 'express';
import pool from '../db.js';

const router = Router();

const ZAPSIGN_API_URL = process.env.ZAPSIGN_API_URL || 'https://api.zapsign.com.br';
const ZAPSIGN_API_TOKEN = process.env.ZAPSIGN_API_TOKEN || '';
const ZAPSIGN_TEMPLATE_ID = process.env.ZAPSIGN_TEMPLATE_ID || '';
const ZAPSIGN_SANDBOX = process.env.ZAPSIGN_SANDBOX === 'true';

// POST /api/contratos/generate — generate a contract via ZapSign
router.post('/generate', async (req, res) => {
  try {
    const { interest_id, aluno_id, turma_id, taxa_reserva, saldo_pix, parcelas_cartao, valor_parcela } = req.body;

    if (!ZAPSIGN_API_TOKEN || !ZAPSIGN_TEMPLATE_ID) {
      return res.status(400).json({ error: 'ZapSign não configurada. Defina ZAPSIGN_API_TOKEN e ZAPSIGN_TEMPLATE_ID nas variáveis de ambiente.' });
    }

    // Check if contract already exists for this enrollment
    if (interest_id) {
      const existing = await pool.query(
        'SELECT id, sign_url, status FROM contratos WHERE interest_id = $1 AND status != $2',
        [interest_id, 'cancelled']
      );
      if (existing.rows.length > 0) {
        return res.json(existing.rows[0]);
      }
    }

    // Fetch student + course + turma + unidade data
    const dataResult = await pool.query(`
      SELECT a.nome as aluno_nome, a.email as aluno_email, a.whatsapp as aluno_whatsapp,
             a.cpf as aluno_cpf, a.rg as aluno_rg, a.data_nascimento as aluno_nascimento,
             a.endereco as aluno_endereco, a.cidade as aluno_cidade, a.uf as aluno_uf,
             a.cep as aluno_cep, a.profissao as aluno_profissao,
             c.nome as curso_nome, c.preco as curso_preco, c.carga_horaria as curso_carga_horaria,
             c.descricao as curso_descricao, c.id as curso_id,
             t.name as turma_nome, t.start_date, t.end_date, t.days_of_week, t.period,
             t.horario_inicio, t.horario_fim, t.local_aula, t.endereco_aula,
             t.carga_horaria_total, t.acompanhamento_inicio, t.acompanhamento_fim, t.sessoes_online,
             s.nome as sala_nome,
             u.nome as unidade_nome, u.cidade as unidade_cidade, u.endereco as unidade_endereco,
             u.comarca, u.estado_comarca,
             aci.id as interest_id
      FROM alunos a
      LEFT JOIN aluno_curso_interests aci ON aci.aluno_id = a.id AND aci.turma_id = $2
      LEFT JOIN turmas t ON t.id = $2
      LEFT JOIN cursos c ON c.id = t.curso_id
      LEFT JOIN salas s ON s.id = t.sala_id
      LEFT JOIN unidades u ON u.id = s.unidade_id
      WHERE a.id = $1
    `, [aluno_id, turma_id]);

    if (dataResult.rows.length === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    const d = dataResult.rows[0];

    // Fetch módulos from curso_modulos table
    let modulos = [];
    if (d.curso_id) {
      const modulosResult = await pool.query(
        'SELECT titulo FROM curso_modulos WHERE curso_id = $1 ORDER BY ordem ASC LIMIT 10',
        [d.curso_id]
      );
      modulos = modulosResult.rows.map(m => m.titulo);
    }

    const today = new Date().toLocaleDateString('pt-BR');
    const startDate = d.start_date ? new Date(d.start_date).toLocaleDateString('pt-BR') : '';
    const endDate = d.end_date ? new Date(d.end_date).toLocaleDateString('pt-BR') : '';
    const nascimento = d.aluno_nascimento ? new Date(d.aluno_nascimento).toLocaleDateString('pt-BR') : '';
    const preco = d.curso_preco ? `R$ ${parseFloat(d.curso_preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
    const cargaHoraria = d.carga_horaria_total || d.curso_carga_horaria || '';
    const acompInicio = d.acompanhamento_inicio ? new Date(d.acompanhamento_inicio).toLocaleDateString('pt-BR') : '';
    const acompFim = d.acompanhamento_fim ? new Date(d.acompanhamento_fim).toLocaleDateString('pt-BR') : '';
    const sessoesOnline = d.sessoes_online || '';

    // Map days_of_week numbers to names
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const diasSemana = d.days_of_week ? d.days_of_week.map(n => dayNames[n] || '').join(', ') : '';

    // Horário — use explicit fields, fallback to period-based defaults
    let horario = '';
    if (d.horario_inicio && d.horario_fim) {
      horario = `Das ${d.horario_inicio}h às ${d.horario_fim}h`;
    } else if (d.period) {
      const periodHours = { manha: 'Das 9h às 12h', tarde: 'Das 14:30h às 17:30h', noite: 'Das 19h às 22h' };
      horario = periodHours[d.period] || '';
    }

    // Local e endereço — turma > sala > unidade
    const localAula = d.local_aula || d.sala_nome || d.unidade_nome || '';
    const enderecoAula = d.endereco_aula || d.unidade_endereco || '';

    // Cidade + UF do aluno
    const cidadeUf = [d.aluno_cidade, d.aluno_uf].filter(Boolean).join(' / ');

    // QTD Encontros (based on carga_horaria / 3h per class)
    const ch = parseInt(d.carga_horaria_total || d.curso_carga_horaria || 0);
    const qtdEncontros = ch > 0 ? Math.ceil(ch / 3).toString() : '';

    // Comarca (from unidade, fallback to city)
    const comarca = d.comarca || d.unidade_cidade || '';
    const estadoComarca = d.estado_comarca || d.aluno_uf || '';

    // Format phone for ZapSign signer
    const phone = (d.aluno_whatsapp || '').replace(/\D/g, '');
    const phoneCountry = phone.length > 11 ? phone.substring(0, 2) : '55';
    const phoneNumber = phone.length > 11 ? phone.substring(2) : phone;

    // Formatting helpers for contract display
    const formatCPF = (cpf) => {
      const digits = (cpf || '').replace(/\D/g, '').padStart(11, '0');
      return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9,11)}`;
    };
    const formatCEP = (cep) => {
      const digits = (cep || '').replace(/\D/g, '').padStart(8, '0');
      return `${digits.slice(0,5)}-${digits.slice(5,8)}`;
    };
    const formatTelefone = (tel) => {
      const digits = (tel || '').replace(/\D/g, '');
      const num = digits.length > 11 ? digits.substring(2) : digits;
      if (num.length === 11) return `(${num.slice(0,2)}) ${num.slice(2,7)}-${num.slice(7)}`;
      if (num.length === 10) return `(${num.slice(0,2)}) ${num.slice(2,6)}-${num.slice(6)}`;
      return tel || '';
    };

    // Build variable mapping — include BOTH space and underscore variants
    // to ensure compatibility with any template format
    const vars = [
      // Aluno
      ['NOME ALUNO', d.aluno_nome || ''],
      ['CPF ALUNO', d.aluno_cpf ? formatCPF(d.aluno_cpf) : ''],
      ['RG ALUNO', d.aluno_rg || ''],
      ['DATA NASCIMENTO', nascimento],
      ['ENDERECO ALUNO', d.aluno_endereco || ''],
      ['CIDADE UF', cidadeUf],
      ['CEP ALUNO', d.aluno_cep ? formatCEP(d.aluno_cep) : ''],
      ['PROFISSAO ALUNO', d.aluno_profissao || ''],
      ['TELEFONE', formatTelefone(d.aluno_whatsapp)],
      ['EMAIL', d.aluno_email || ''],
      // Curso
      ['CURSO NOME', d.curso_nome || ''],
      ['DESCRICAO CURSO', d.curso_descricao || ''],
      ['QTD ENCONTROS', qtdEncontros],
      ['VALOR CURSO', preco],
      // Turma
      ['TURMA CIDADE', d.unidade_cidade || ''],
      ['DATA INICIO', startDate],
      ['DATA FIM', endDate],
      ['DATA INICIO CURSO', startDate],
      ['DATA FIM CURSO', endDate],
      ['DIAS SEMANA', diasSemana],
      ['DIAS DA SEMANA', diasSemana],
      ['HORARIO', horario],
      ['HORARIO AULAS', horario],
      ['LOCAL AULA', localAula],
      ['LOCAL AULAS', localAula],
      ['ENDERECO AULA', enderecoAula],
      ['ENDERECO LOCAL AULAS', enderecoAula],
      ['CARGA HORARIA', cargaHoraria ? `${cargaHoraria}` : ''],
      // Acompanhamento online
      ['DATA INICIO ACOMPANHAMENTO', acompInicio],
      ['DATA FIM ACOMPANHAMENTO', acompFim],
      ['DIA HORARIO SESSOES ONLINE', sessoesOnline],
      // Pagamento
      ['TAXA RESERVA', taxa_reserva || ''],
      ['SALDO PIX', saldo_pix || ''],
      ['PARCELAS CARTAO', parcelas_cartao || ''],
      ['VALOR PARCELA', valor_parcela || ''],
      // Jurídico
      ['COMARCA', comarca],
      ['ESTADO COMARCA', estadoComarca],
      ['DATA CONTRATO', today],
    ];

    // Add módulos
    for (let i = 0; i < 10; i++) {
      const num = String(i + 1).padStart(2, '0');
      vars.push([`MODULO ${num}`, modulos[i] || '']);
    }

    // Generate data array with both {{SPACE}} and {{UNDERSCORE}} variants
    const data = [];
    for (const [name, value] of vars) {
      data.push({ de: `{{${name}}}`, para: value });
      const underscored = name.replace(/ /g, '_');
      if (underscored !== name) {
        data.push({ de: `{{${underscored}}}`, para: value });
      }
    }

    // Create document via ZapSign template
    const zapsignBody = {
      sandbox: ZAPSIGN_SANDBOX,
      template_id: ZAPSIGN_TEMPLATE_ID,
      signer_name: d.aluno_nome || 'Aluno',
      signer_email: d.aluno_email || '',
      signer_phone_country: phoneCountry,
      signer_phone_number: phoneNumber,
      lang: 'pt-br',
      disable_signer_emails: false,
      send_automatic_email: !!(d.aluno_email),
      external_id: `ozi-${aluno_id}-${turma_id}`,
      folder_path: '/OZI CRM/Contratos/',
      data
    };

    const zapsignResponse = await fetch(`${ZAPSIGN_API_URL}/api/v1/models/create-doc/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ZAPSIGN_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(zapsignBody)
    });

    if (!zapsignResponse.ok) {
      const errorData = await zapsignResponse.text();
      console.error('ZapSign error:', errorData);
      return res.status(502).json({ error: `Erro ao criar contrato na ZapSign: ${errorData}` });
    }

    const zapsignData = await zapsignResponse.json();
    const signer = zapsignData.signers?.[0];
    const appDomain = ZAPSIGN_API_URL.includes('sandbox') ? 'sandbox.app.zapsign.com.br' : 'app.zapsign.com.br';
    const signUrl = signer ? `https://${appDomain}/verificar/${signer.token}` : '';

    // Save to DB
    const result = await pool.query(`
      INSERT INTO contratos (interest_id, aluno_id, turma_id, zapsign_doc_token, zapsign_signer_token, sign_url, original_file_url, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      d.interest_id || interest_id || null,
      aluno_id,
      turma_id,
      zapsignData.token,
      signer?.token || null,
      signUrl,
      zapsignData.original_file || null,
      req.user?.id || null
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error generating contract:', error);
    res.status(500).json({ error: 'Erro ao gerar contrato' });
  }
});

// POST /api/contratos/:id/cancel — cancel a contract so a new one can be generated
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const contrato = await pool.query('SELECT * FROM contratos WHERE id = $1', [id]);
    if (contrato.rows.length === 0) return res.status(404).json({ error: 'Contrato não encontrado' });

    const c = contrato.rows[0];

    // Try to cancel in ZapSign
    if (c.zapsign_doc_token && ZAPSIGN_API_TOKEN) {
      try {
        await fetch(`${ZAPSIGN_API_URL}/api/v1/docs/${c.zapsign_doc_token}/cancel/`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${ZAPSIGN_API_TOKEN}` }
        });
      } catch (e) { console.warn('ZapSign cancel failed:', e); }
    }

    // Mark as cancelled in DB
    await pool.query(`UPDATE contratos SET status = 'cancelled' WHERE id = $1`, [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling contract:', error);
    res.status(500).json({ error: 'Erro ao cancelar contrato' });
  }
});

// GET /api/contratos — list contracts
router.get('/', async (req, res) => {
  try {
    const { turma_id, aluno_id, status } = req.query;
    let query = `
      SELECT c.*, a.nome as aluno_nome, a.whatsapp as aluno_whatsapp,
             t.name as turma_nome, cu.nome as curso_nome
      FROM contratos c
      JOIN alunos a ON a.id = c.aluno_id
      LEFT JOIN turmas t ON t.id = c.turma_id
      LEFT JOIN cursos cu ON cu.id = t.curso_id
    `;
    const params = [];
    const conditions = [];

    if (turma_id) { params.push(turma_id); conditions.push(`c.turma_id = $${params.length}`); }
    if (aluno_id) { params.push(aluno_id); conditions.push(`c.aluno_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`c.status = $${params.length}`); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY c.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing contracts:', error);
    res.status(500).json({ error: 'Erro ao listar contratos' });
  }
});

// GET /api/contratos/by-enrollment/:aluno_id/:turma_id — get contract for a specific enrollment
router.get('/by-enrollment/:aluno_id/:turma_id', async (req, res) => {
  try {
    const { aluno_id, turma_id } = req.params;
    const result = await pool.query(
      `SELECT * FROM contratos WHERE aluno_id = $1 AND turma_id = $2 AND status != 'cancelled' ORDER BY created_at DESC LIMIT 1`,
      [aluno_id, turma_id]
    );
    if (result.rows.length === 0) return res.json(null);

    const contrato = result.rows[0];

    // Optionally refresh status from ZapSign
    if (contrato.status === 'pending' && contrato.zapsign_doc_token && ZAPSIGN_API_TOKEN) {
      try {
        const zsRes = await fetch(`${ZAPSIGN_API_URL}/api/v1/docs/${contrato.zapsign_doc_token}/`, {
          headers: { 'Authorization': `Bearer ${ZAPSIGN_API_TOKEN}` }
        });
        if (zsRes.ok) {
          const zsData = await zsRes.json();
          if (zsData.status === 'signed') {
            await pool.query(
              `UPDATE contratos SET status = 'signed', signed_at = NOW(), signed_file_url = $2 WHERE id = $1`,
              [contrato.id, zsData.signed_file || null]
            );
            contrato.status = 'signed';
            contrato.signed_file_url = zsData.signed_file || null;
          }
        }
      } catch (e) { console.warn('ZapSign status check failed:', e); }
    }

    res.json(contrato);
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: 'Erro ao buscar contrato' });
  }
});

// GET /api/contratos/overview — all enrolled students with contract status
router.get('/overview', async (req, res) => {
  try {
    const { unidade_id } = req.query;
    let query = `
      SELECT 
        a.id as aluno_id, a.nome as aluno_nome, a.whatsapp as aluno_whatsapp, a.email as aluno_email,
        a.cpf as aluno_cpf, a.rg as aluno_rg, a.endereco as aluno_endereco,
        a.cidade as aluno_cidade, a.uf as aluno_uf, a.profissao as aluno_profissao,
        a.data_nascimento as aluno_nascimento, a.cep as aluno_cep,
        t.id as turma_id, t.name as turma_nome,
        cu.nome as curso_nome, cu.preco as curso_preco,
        c.id as contrato_id, c.status as contrato_status, c.sign_url, c.created_at as contrato_created_at,
        c.signed_at, c.zapsign_doc_token
      FROM aluno_curso_interests aci
      JOIN alunos a ON a.id = aci.aluno_id
      JOIN turmas t ON t.id = aci.turma_id
      JOIN cursos cu ON cu.id = t.curso_id
      LEFT JOIN salas s ON s.id = t.sala_id
      LEFT JOIN contratos c ON c.aluno_id = a.id AND c.turma_id = t.id AND c.status != 'cancelled'
      WHERE aci.status = 'enrolled'
    `;
    const params = [];
    if (unidade_id) {
      params.push(unidade_id);
      query += ` AND s.unidade_id = $${params.length}`;
    }
    query += ' ORDER BY t.name, a.nome';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error loading contracts overview:', error);
    res.status(500).json({ error: 'Erro ao carregar visão geral de contratos' });
  }
});

// POST /api/contratos/:id/refresh — refresh contract status from ZapSign
router.post('/:id/refresh', async (req, res) => {
  try {
    const { id } = req.params;
    const contrato = await pool.query('SELECT * FROM contratos WHERE id = $1', [id]);
    if (contrato.rows.length === 0) return res.status(404).json({ error: 'Contrato não encontrado' });

    const c = contrato.rows[0];
    if (!c.zapsign_doc_token || !ZAPSIGN_API_TOKEN) {
      return res.json(c);
    }

    const zsRes = await fetch(`${ZAPSIGN_API_URL}/api/v1/docs/${c.zapsign_doc_token}/`, {
      headers: { 'Authorization': `Bearer ${ZAPSIGN_API_TOKEN}` }
    });
    if (zsRes.ok) {
      const zsData = await zsRes.json();
      let newStatus = c.status;
      if (zsData.status === 'signed') newStatus = 'signed';
      else if (zsData.status === 'refused') newStatus = 'refused';
      else if (zsData.status === 'expired') newStatus = 'expired';

      if (newStatus !== c.status) {
        await pool.query(
          `UPDATE contratos SET status = $2, signed_at = CASE WHEN $2 = 'signed' THEN NOW() ELSE signed_at END, signed_file_url = $3 WHERE id = $1`,
          [id, newStatus, zsData.signed_file || null]
        );
        c.status = newStatus;
        c.signed_file_url = zsData.signed_file || null;
      }
    }

    res.json(c);
  } catch (error) {
    console.error('Error refreshing contract:', error);
    res.status(500).json({ error: 'Erro ao atualizar status do contrato' });
  }
});

export default router;
