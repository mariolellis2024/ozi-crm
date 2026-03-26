import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/certificates/:alunoId/:cursoId — generate certificate HTML
router.get('/:alunoId/:cursoId', async (req, res) => {
  try {
    const { alunoId, cursoId } = req.params;

    // Get student info
    const alunoResult = await pool.query('SELECT nome, email FROM alunos WHERE id = $1', [alunoId]);
    if (alunoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    // Get course info
    const cursoResult = await pool.query('SELECT nome, carga_horaria FROM cursos WHERE id = $1', [cursoId]);
    if (cursoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Get enrollment info
    const enrollResult = await pool.query(
      `SELECT aci.status, t.name as turma_name, t.start_date, t.end_date
       FROM aluno_curso_interests aci
       LEFT JOIN turmas t ON t.id = aci.turma_id
       WHERE aci.aluno_id = $1 AND aci.curso_id = $2`,
      [alunoId, cursoId]
    );

    const aluno = alunoResult.rows[0];
    const curso = cursoResult.rows[0];
    const enrollment = enrollResult.rows[0];

    const completionDate = enrollment?.end_date 
      ? new Date(enrollment.end_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    const certificateId = `OZI-${Date.now().toString(36).toUpperCase()}`;

    // Return HTML certificate for printing
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificado - ${aluno.nome}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f0f0f0;
      font-family: 'Inter', sans-serif;
    }
    
    .certificate {
      width: 1100px;
      height: 780px;
      background: linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #0a1628 100%);
      position: relative;
      overflow: hidden;
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 80px;
    }
    
    .border-decoration {
      position: absolute;
      inset: 15px;
      border: 2px solid rgba(45, 212, 191, 0.3);
      border-radius: 8px;
      pointer-events: none;
    }
    
    .border-inner {
      position: absolute;
      inset: 25px;
      border: 1px solid rgba(45, 212, 191, 0.15);
      border-radius: 4px;
      pointer-events: none;
    }
    
    .corner-accent {
      position: absolute;
      width: 60px;
      height: 60px;
      border-color: #2dd4bf;
    }
    
    .corner-tl { top: 20px; left: 20px; border-top: 3px solid; border-left: 3px solid; }
    .corner-tr { top: 20px; right: 20px; border-top: 3px solid; border-right: 3px solid; }
    .corner-bl { bottom: 20px; left: 20px; border-bottom: 3px solid; border-left: 3px solid; }
    .corner-br { bottom: 20px; right: 20px; border-bottom: 3px solid; border-right: 3px solid; }
    
    .logo { font-size: 28px; font-weight: 700; color: #2dd4bf; letter-spacing: 6px; margin-bottom: 8px; }
    .subtitle { font-size: 11px; color: rgba(255,255,255,0.5); letter-spacing: 4px; text-transform: uppercase; margin-bottom: 40px; }
    
    .cert-title {
      font-family: 'Playfair Display', serif;
      font-size: 38px;
      font-weight: 400;
      color: #2dd4bf;
      letter-spacing: 3px;
      margin-bottom: 30px;
    }
    
    .student-name {
      font-family: 'Playfair Display', serif;
      font-size: 36px;
      font-weight: 700;
      color: white;
      margin-bottom: 20px;
    }
    
    .description {
      font-size: 15px;
      color: rgba(255,255,255,0.7);
      text-align: center;
      max-width: 700px;
      line-height: 1.8;
      margin-bottom: 40px;
    }
    
    .course-name {
      color: #2dd4bf;
      font-weight: 600;
    }
    
    .details {
      display: flex;
      gap: 60px;
      margin-bottom: 40px;
    }
    
    .detail-item {
      text-align: center;
    }
    
    .detail-label {
      font-size: 10px;
      color: rgba(255,255,255,0.4);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 4px;
    }
    
    .detail-value {
      font-size: 14px;
      color: rgba(255,255,255,0.8);
      font-weight: 500;
    }
    
    .footer {
      position: absolute;
      bottom: 35px;
      left: 80px;
      right: 80px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .cert-id {
      font-size: 9px;
      color: rgba(255,255,255,0.25);
      letter-spacing: 1px;
    }
    
    .signature-line {
      width: 200px;
      border-top: 1px solid rgba(255,255,255,0.3);
      padding-top: 8px;
      text-align: center;
      font-size: 11px;
      color: rgba(255,255,255,0.5);
    }
    
    @media print {
      body { background: white; }
      .certificate { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="border-decoration"></div>
    <div class="border-inner"></div>
    <div class="corner-accent corner-tl"></div>
    <div class="corner-accent corner-tr"></div>
    <div class="corner-accent corner-bl"></div>
    <div class="corner-accent corner-br"></div>
    
    <div class="logo">OZI</div>
    <div class="subtitle">Centro de Ensino</div>
    
    <div class="cert-title">CERTIFICADO</div>
    
    <div class="student-name">${aluno.nome}</div>
    
    <div class="description">
      Certificamos que o(a) aluno(a) acima concluiu com êxito o curso
      <span class="course-name">${curso.nome}</span>${curso.carga_horaria ? `, com carga horária total de <strong>${curso.carga_horaria} horas</strong>` : ''},
      demonstrando dedicação e aproveitamento satisfatório dos conteúdos ministrados.
    </div>
    
    <div class="details">
      <div class="detail-item">
        <div class="detail-label">Data de Conclusão</div>
        <div class="detail-value">${completionDate}</div>
      </div>
      ${curso.carga_horaria ? `
      <div class="detail-item">
        <div class="detail-label">Carga Horária</div>
        <div class="detail-value">${curso.carga_horaria}h</div>
      </div>` : ''}
      <div class="detail-item">
        <div class="detail-label">Certificado Nº</div>
        <div class="detail-value">${certificateId}</div>
      </div>
    </div>
    
    <div class="footer">
      <div class="cert-id">ID: ${certificateId}</div>
      <div class="signature-line">Coordenação</div>
    </div>
  </div>
  
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ error: 'Erro ao gerar certificado' });
  }
});

export default router;
