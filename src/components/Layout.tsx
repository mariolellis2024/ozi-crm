import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { GraduationCap, User, LogOut, BookOpen, Home, DoorClosed, Activity, Users, BarChart3, CalendarDays, GitBranch, ClipboardList, Wallet, Building2, ChevronDown, FileText, Menu, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { PerformanceDashboard } from './PerformanceDashboard';
import { useUnidade } from '../contexts/UnidadeContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { unidades, selectedUnidadeId, setSelectedUnidadeId, selectedUnidade } = useUnidade();

  useEffect(() => {
    api.getUser().then(setUser);
  }, []);

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

  function handleNavigate(path: string) {
    navigate(path);
    setSidebarOpen(false); // Close sidebar on mobile after navigation
  }

  // Pages that filter by unidade (above the separator)
  const filteredMenuItems = [
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
    { icon: FileText, label: 'Formulários', path: '/formularios' },
  ];

  // Pages that are global (below the separator)
  const globalMenuItems = [
    { icon: Building2, label: 'Unidades', path: '/unidades' },
    { icon: Users, label: 'Usuários', path: '/usuarios' },
  ];

  const visibleGlobalItems = user?.is_super_admin ? globalMenuItems : [];

  return (
    <div className="min-h-screen flex fade-in">
      {/* Mobile hamburger button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-dark-card rounded-lg text-gray-400 hover:text-white transition-colors"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 bg-dark-lighter fixed h-full flex flex-col z-50 transition-transform duration-300
        lg:translate-x-0 lg:slide-in-left
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Mobile close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-1 text-gray-400 hover:text-white transition-colors"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-6 pt-6 scale-in">
          <div className="flex items-center justify-center space-x-3">
            <img src="/icon.webp" alt="OZI CRM Logo" className="w-[48%] h-auto flex-shrink-0" />
          </div>
        </div>

        {/* Unidade filter dropdown */}
        {unidades.length > 0 && (
          <div className="px-4 mt-4 scale-in">
            <div className="relative">
              <select
                value={selectedUnidadeId}
                onChange={(e) => setSelectedUnidadeId(e.target.value)}
                className="w-full bg-dark-card text-white text-xs rounded-lg px-3 py-2 pr-8 border border-gray-600 focus:border-teal-accent outline-none appearance-none cursor-pointer"
              >
                <option value="">🌐 Todas as Unidades</option>
                {unidades.map(u => (
                  <option key={u.id} value={u.id}>📍 {u.nome}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        <nav className="mt-4 flex-1 overflow-y-auto scale-in-delay-1">
          {/* Filtered pages */}
          {filteredMenuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => handleNavigate(item.path)}
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

          {/* Separator */}
          {visibleGlobalItems.length > 0 && <div className="mx-4 my-2 border-t border-gray-700" />}

          {/* Global pages */}
          {visibleGlobalItems.map((item, index) => (
            <button
              key={index}
              onClick={() => handleNavigate(item.path)}
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

        <div className="p-6 scale-in-delay-2">
          {selectedUnidade && (
            <div className="text-xs text-teal-accent mb-3 px-1 truncate" title={selectedUnidade.nome}>
              📍 {selectedUnidade.nome}
            </div>
          )}

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

      {/* Main content — responsive margin */}
      <main className="lg:ml-64 w-full fade-in-delay-1 pt-14 lg:pt-0">
        {children}
      </main>

      <PerformanceDashboard
        isOpen={showPerformanceDashboard}
        onClose={() => setShowPerformanceDashboard(false)}
      />
    </div>
  );
}