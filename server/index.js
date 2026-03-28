import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { authenticateToken } from './auth.js';

// Routes
import authRoutes from './routes/auth.js';
import alunosRoutes from './routes/alunos.js';
import cursosRoutes from './routes/cursos.js';
import turmasRoutes from './routes/turmas.js';
import professoresRoutes from './routes/professores.js';
import salasRoutes from './routes/salas.js';
import unidadesRoutes from './routes/unidades.js';
import categoriasRoutes from './routes/categorias.js';
import interestsRoutes from './routes/interests.js';
import usersRoutes from './routes/users.js';
import activityRoutes from './routes/activity.js';
import dashboardRoutes from './routes/dashboard.js';
import pipelineRoutes from './routes/pipeline.js';
import certificatesRoutes from './routes/certificates.js';
import pagamentosRoutes from './routes/pagamentos.js';
import uploadRoutes from './routes/upload.js';
import formulariosRoutes from './routes/formularios.js';
import formsPublicRoutes from './routes/forms-public.js';
import contactHistoryRoutes from './routes/contact-history.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());


// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/public/forms', formsPublicRoutes);

// Protected routes
app.use('/api/alunos', authenticateToken, alunosRoutes);
app.use('/api/cursos', authenticateToken, cursosRoutes);
app.use('/api/turmas', authenticateToken, turmasRoutes);
app.use('/api/professores', authenticateToken, professoresRoutes);
app.use('/api/salas', authenticateToken, salasRoutes);
app.use('/api/unidades', authenticateToken, unidadesRoutes);
app.use('/api/categorias', authenticateToken, categoriasRoutes);
app.use('/api/interests', authenticateToken, interestsRoutes);
app.use('/api/users', authenticateToken, usersRoutes);
app.use('/api/activity', authenticateToken, activityRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/pipeline', authenticateToken, pipelineRoutes);
app.use('/api/certificates', authenticateToken, certificatesRoutes);
app.use('/api/pagamentos', authenticateToken, pagamentosRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);
app.use('/api/formularios', authenticateToken, formulariosRoutes);
app.use('/api/contact-history', authenticateToken, contactHistoryRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

import { runMigrations } from './migrate.js';

// Run database migrations then start server
runMigrations().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 OZI CRM Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to run migrations:', err);
  process.exit(1);
});
