import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Activity, Filter, UserPlus, Pencil, Trash2, LogIn, Ban, ShieldOff, Users, BookOpen, GraduationCap, Home, DoorClosed } from 'lucide-react';

interface ActivityLog {
  id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  details: any;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  create: { label: 'Criou', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: UserPlus },
  update: { label: 'Atualizou', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', icon: Pencil },
  delete: { label: 'Excluiu', color: 'text-red-400 bg-red-500/10 border-red-500/30', icon: Trash2 },
  enroll: { label: 'Matriculou', color: 'text-teal-400 bg-teal-500/10 border-teal-500/30', icon: LogIn },
  unenroll: { label: 'Desmatriculou', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30', icon: LogIn },
  block: { label: 'Bloqueou', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: Ban },
  unblock: { label: 'Desbloqueou', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: ShieldOff },
  login: { label: 'Login', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', icon: LogIn },
};

const ENTITY_CONFIG: Record<string, { label: string; icon: any }> = {
  turma: { label: 'Turma', icon: Home },
  aluno: { label: 'Aluno', icon: Users },
  curso: { label: 'Curso', icon: BookOpen },
  professor: { label: 'Professor', icon: GraduationCap },
  sala: { label: 'Sala', icon: DoorClosed },
  user: { label: 'Usuário', icon: Users },
  interest: { label: 'Interesse', icon: Activity },
};

export function Atividades() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [count, setCount] = useState(0);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const limit = 30;

  useEffect(() => {
    loadLogs();
  }, [filter, page]);

  async function loadLogs() {
    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(page * limit));
      if (filter) params.set('entity_type', filter);
      const data = await api.get(`/api/activity?${params.toString()}`);
      setLogs(data.data);
      setCount(data.count);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
    }
  }

  function formatTimeAgo(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin}min atrás`;
    if (diffHrs < 24) return `${diffHrs}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  }

  const entityTypes = ['turma', 'aluno', 'curso', 'professor', 'sala', 'user'];
  const totalPages = Math.ceil(count / limit);

  return (
    <div className="p-8 fade-in">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Atividades</h1>
            <p className="text-gray-400 mt-2">Histórico de ações realizadas no sistema</p>
          </div>
          <span className="text-gray-500 text-sm">{count} registros</span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="h-4 w-4 text-gray-400" />
          <button
            onClick={() => { setFilter(''); setPage(0); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !filter ? 'bg-teal-accent text-dark' : 'bg-dark-lighter text-gray-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          {entityTypes.map(type => (
            <button
              key={type}
              onClick={() => { setFilter(type); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === type ? 'bg-teal-accent text-dark' : 'bg-dark-lighter text-gray-400 hover:text-white'
              }`}
            >
              {ENTITY_CONFIG[type]?.label || type}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="space-y-1">
          {logs.map((log) => {
            const actionCfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.update;
            const entityCfg = ENTITY_CONFIG[log.entity_type] || ENTITY_CONFIG.interest;
            const ActionIcon = actionCfg.icon;

            return (
              <div key={log.id} className="bg-dark-card rounded-xl p-4 flex items-center gap-4 hover:bg-dark-lighter/50 transition-colors">
                <div className={`p-2 rounded-lg border ${actionCfg.color}`}>
                  <ActionIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">
                    <span className="text-gray-400">{log.user_email || 'Sistema'}</span>
                    {' '}<span className="font-medium">{actionCfg.label.toLowerCase()}</span>{' '}
                    <span className="text-gray-400">{entityCfg.label.toLowerCase()}</span>
                    {log.entity_name && (
                      <span className="text-white font-medium"> "{log.entity_name}"</span>
                    )}
                  </p>
                </div>
                <span className="text-gray-500 text-xs whitespace-nowrap">
                  {formatTimeAgo(log.created_at)}
                </span>
              </div>
            );
          })}

          {logs.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhuma atividade registrada</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-lg bg-dark-card text-gray-400 disabled:opacity-30 hover:text-white transition-colors"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-gray-400 text-sm">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 rounded-lg bg-dark-card text-gray-400 disabled:opacity-30 hover:text-white transition-colors"
            >
              Próximo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
