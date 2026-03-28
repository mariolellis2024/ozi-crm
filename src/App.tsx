import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './lib/api';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { UnidadeProvider } from './contexts/UnidadeContext';
import { Toaster } from 'react-hot-toast';

// Lazy-loaded pages — each becomes a separate chunk
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const Turmas = lazy(() => import('./pages/Turmas').then(m => ({ default: m.Turmas })));
const Alunos = lazy(() => import('./pages/Alunos').then(m => ({ default: m.Alunos })));
const Cursos = lazy(() => import('./pages/Cursos').then(m => ({ default: m.Cursos })));
const Professores = lazy(() => import('./pages/Professores').then(m => ({ default: m.Professores })));
const Salas = lazy(() => import('./pages/Salas').then(m => ({ default: m.Salas })));
const Unidades = lazy(() => import('./pages/Unidades').then(m => ({ default: m.Unidades })));
const Usuarios = lazy(() => import('./pages/Usuarios').then(m => ({ default: m.Usuarios })));
const Calendario = lazy(() => import('./pages/Calendario').then(m => ({ default: m.Calendario })));
const Pipeline = lazy(() => import('./pages/Pipeline').then(m => ({ default: m.Pipeline })));
const Atividades = lazy(() => import('./pages/Atividades').then(m => ({ default: m.Atividades })));
const Pagamentos = lazy(() => import('./pages/Pagamentos').then(m => ({ default: m.Pagamentos })));
const Formularios = lazy(() => import('./pages/Formularios').then(m => ({ default: m.Formularios })));
const FormularioPublico = lazy(() => import('./pages/FormularioPublico').then(m => ({ default: m.FormularioPublico })));

interface User {
  id: string;
  email: string;
  full_name?: string;
}

// Auth cache — avoid re-fetching /api/auth/me on every navigation
let cachedUser: User | null = null;
let cacheChecked = false;

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [loading, setLoading] = useState(!cacheChecked);

  useEffect(() => {
    async function checkAuth() {
      if (cacheChecked) {
        setUser(cachedUser);
        setLoading(false);
        return;
      }
      if (!api.isAuthenticated()) {
        cacheChecked = true;
        setLoading(false);
        return;
      }
      const userData = await api.getUser();
      cachedUser = userData;
      cacheChecked = true;
      setUser(userData);
      setLoading(false);
    }
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-accent border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      {children}
    </Layout>
  );
}

// Suspense fallback for lazy-loaded pages
function PageLoader() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-accent border-t-transparent"></div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/f/:slug" element={<FormularioPublico />} />
          <Route path="*" element={
            <UnidadeProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                  <Route path="/turmas" element={<PrivateRoute><Turmas /></PrivateRoute>} />
                  <Route path="/alunos" element={<PrivateRoute><Alunos /></PrivateRoute>} />
                  <Route path="/cursos" element={<PrivateRoute><Cursos /></PrivateRoute>} />
                  <Route path="/professores" element={<PrivateRoute><Professores /></PrivateRoute>} />
                  <Route path="/salas" element={<PrivateRoute><Salas /></PrivateRoute>} />
                  <Route path="/unidades" element={<PrivateRoute><Unidades /></PrivateRoute>} />
                  <Route path="/usuarios" element={<PrivateRoute><Usuarios /></PrivateRoute>} />
                  <Route path="/calendario" element={<PrivateRoute><Calendario /></PrivateRoute>} />
                  <Route path="/pipeline" element={<PrivateRoute><Pipeline /></PrivateRoute>} />
                  <Route path="/atividades" element={<PrivateRoute><Atividades /></PrivateRoute>} />
                  <Route path="/pagamentos" element={<PrivateRoute><Pagamentos /></PrivateRoute>} />
                  <Route path="/formularios" element={<PrivateRoute><Formularios /></PrivateRoute>} />
                </Routes>
              </Suspense>
              <Toaster position="top-right" />
            </UnidadeProvider>
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}