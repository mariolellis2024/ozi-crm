import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './lib/api';
import { Login } from './components/Login';
import { Professores } from './pages/Professores';
import { Alunos } from './pages/Alunos';
import { Cursos } from './pages/Cursos';
import { Turmas } from './pages/Turmas';
import { Salas } from './pages/Salas';
import { Layout } from './components/Layout';
import { Toaster } from 'react-hot-toast';
import { OrganicBackground } from './components/OrganicBackground';

interface User {
  id: string;
  email: string;
  full_name?: string;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      if (!api.isAuthenticated()) {
        setLoading(false);
        return;
      }
      const userData = await api.getUser();
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

export default function App() {
  return (
    <BrowserRouter>
      <OrganicBackground />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Turmas />
            </PrivateRoute>
          }
        />
        <Route
          path="/professores"
          element={
            <PrivateRoute>
              <Professores />
            </PrivateRoute>
          }
        />
        <Route
          path="/alunos"
          element={
            <PrivateRoute>
              <Alunos />
            </PrivateRoute>
          }
        />
        <Route
          path="/cursos"
          element={
            <PrivateRoute>
              <Cursos />
            </PrivateRoute>
          }
        />
        <Route
          path="/turmas"
          element={
            <PrivateRoute>
              <Turmas />
            </PrivateRoute>
          }
        />
        <Route
          path="/salas"
          element={
            <PrivateRoute>
              <Salas />
            </PrivateRoute>
          }
        />
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}