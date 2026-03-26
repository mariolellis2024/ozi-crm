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
import categoriasRoutes from './routes/categorias.js';
import interestsRoutes from './routes/interests.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/alunos', authenticateToken, alunosRoutes);
app.use('/api/cursos', authenticateToken, cursosRoutes);
app.use('/api/turmas', authenticateToken, turmasRoutes);
app.use('/api/professores', authenticateToken, professoresRoutes);
app.use('/api/salas', authenticateToken, salasRoutes);
app.use('/api/categorias', authenticateToken, categoriasRoutes);
app.use('/api/interests', authenticateToken, interestsRoutes);

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 OZI CRM Server running on port ${PORT}`);
});
