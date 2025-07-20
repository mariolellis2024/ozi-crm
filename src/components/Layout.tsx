import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { GraduationCap, User, LogOut, BookOpen, Home, ChevronLeft, ChevronRight, DoorClosed } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Props do componente Layout
 */
interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Componente Layout Principal
 * 
 * Responsável por:
 * - Renderizar a estrutura base da aplicação (sidebar + conteúdo)
 * - Gerenciar navegação entre páginas
 * - Controlar logout do usuário
 * - Fornecer feedback visual de navegação ativa
 * 
 * @param children - Conteúdo a ser renderizado na área principal
 */
export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  /**
   * Gerencia o logout do usuário
   * 
   * Trata diferentes cenários de erro:
   * - Sessão já expirada
   * - Erros de rede
   * - Outros erros inesperados
   */
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Handle specific session not found error
        if (error.message.includes('Session from session_id claim in JWT does not exist') || 
            error.message.includes('session_not_found')) {
          toast.success('Sessão já expirada - desconectado com sucesso');
        } else {
          console.warn('Logout warning:', error.message);
          toast.error('Erro ao desconectar, mas você foi redirecionado');
        }
      } else {
        toast.success('Desconectado com sucesso');
      }
      navigate('/login');
    } catch (error: any) {
      // Handle network or other unexpected errors
      if (error.message && (error.message.includes('Session from session_id claim in JWT does not exist') || 
          error.message.includes('session_not_found'))) {
        toast.success('Sessão já expirada - desconectado com sucesso');
      } else {
        console.warn('Logout error:', error.message);
        toast.error('Erro ao desconectar, mas você foi redirecionado');
      }
      navigate('/login');
    }
  };

  /**
   * Configuração dos itens do menu de navegação
   * Cada item contém ícone, label e rota correspondente
   */
  const menuItems = [
    { icon: Home, label: 'Turmas', path: '/' },
    { icon: User, label: 'Alunos', path: '/alunos' },
    { icon: BookOpen, label: 'Cursos', path: '/cursos' },
    { icon: GraduationCap, label: 'Professores', path: '/professores' },
    { icon: DoorClosed, label: 'Salas', path: '/salas' },
  ];

  return (
    <div className="min-h-screen flex fade-in">
      <aside className="w-64 bg-dark-lighter fixed h-full slide-in-left">
        <div className="p-6 scale-in">
          <div className="flex items-center justify-center space-x-3">
            <img src="/icon.webp" alt="Pepper Heads Logo" className="h-8 w-8 flex-shrink-0 rounded" />
            <span className="text-xl font-bold text-white opacity-100">
              Pepper Heads
            </span>
          </div>
        </div>
        <nav className="mt-6 scale-in-delay-1">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center px-6 py-4 text-gray-400 hover:text-white hover:bg-dark-card transition-all duration-200 hover:translate-x-1 ${
                location.pathname === item.path ? 'bg-dark-card text-white' : ''
              }`}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="opacity-100 ml-4">
                {item.label}
              </span>
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full p-6 scale-in-delay-2">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center text-gray-400 hover:text-white transition-all duration-200 hover:translate-x-1"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="opacity-100 ml-4">
              Sair
            </span>
          </button>
        </div>
      </aside>
      <main className="ml-64 w-full fade-in-delay-1">
        {children}
      </main>
    </div>
  );
}