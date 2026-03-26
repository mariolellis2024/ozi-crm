import { useState } from 'react';
import { api } from '../lib/api';
import { GraduationCap, User, LogOut, BookOpen, Home, DoorClosed, Activity, Users, BarChart3, CalendarDays, GitBranch, ClipboardList, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { PerformanceDashboard } from './PerformanceDashboard';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);

  const handleSignOut = async () => {
    try {
      api.logout();
      toast.success('Desconectado com sucesso');
      navigate('/login');
    } catch (error: any) {
      console.warn('Logout error:', error.message);
      toast.error('Erro ao desconectar, mas você foi redirecionado');
      navigate('/login');
    }
  };

  const menuItems = [
    { icon: BarChart3, label: 'Dashboard', path: '/' },
    { icon: Home, label: 'Turmas', path: '/turmas' },
    { icon: User, label: 'Alunos', path: '/alunos' },
    { icon: CalendarDays, label: 'Calendário', path: '/calendario' },
    { icon: GitBranch, label: 'Pipeline', path: '/pipeline' },
    { icon: Wallet, label: 'Pagamentos', path: '/pagamentos' },
    { icon: ClipboardList, label: 'Atividades', path: '/atividades' },
    { icon: BookOpen, label: 'Cursos', path: '/cursos' },
    { icon: GraduationCap, label: 'Professores', path: '/professores' },
    { icon: DoorClosed, label: 'Salas', path: '/salas' },
    { icon: Users, label: 'Usuários', path: '/usuarios' },
  ];

  return (
    <div className="min-h-screen flex fade-in">
      <aside className="w-64 bg-dark-lighter fixed h-full slide-in-left">
        <div className="px-6 pt-6 scale-in">
          <div className="flex items-center justify-center space-x-3">
            <img src="/icon.webp" alt="OZI CRM Logo" className="w-4/5 h-auto flex-shrink-0 rounded" />
          </div>
        </div>
        <nav className="mt-6 scale-in-delay-1">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center px-6 py-3 text-gray-400 hover:text-white hover:bg-dark-card transition-all duration-200 hover:translate-x-1 text-sm ${
                location.pathname === item.path ? 'bg-dark-card text-white' : ''
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="opacity-100 ml-3">
                {item.label}
              </span>
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full p-6 scale-in-delay-2">
          {import.meta.env.DEV && (
            <button
              onClick={() => setShowPerformanceDashboard(true)}
              className="w-full flex items-center text-gray-400 hover:text-white transition-all duration-200 hover:translate-x-1 mb-4"
              title="Dashboard de Performance"
            >
              <Activity className="h-5 w-5 flex-shrink-0" />
              <span className="opacity-100 ml-4">
                Performance
              </span>
            </button>
          )}

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

      <PerformanceDashboard
        isOpen={showPerformanceDashboard}
        onClose={() => setShowPerformanceDashboard(false)}
      />
    </div>
  );
}