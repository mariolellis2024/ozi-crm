import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface Interest {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  aluno_email: string;
  aluno_whatsapp: string;
  curso_id: string;
  curso_nome: string;
  status: string;
  turma_id: string | null;
  created_at: string;
}

interface Curso {
  id: string;
  nome: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  interested: { label: 'Interessados', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/30' },
  enrolled: { label: 'Matriculados', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/30' },
  completed: { label: 'Concluídos', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/30' },
};

const COLUMNS = ['interested', 'enrolled', 'completed'];

export function Pipeline() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedCurso, setSelectedCurso] = useState('');
  const [draggedItem, setDraggedItem] = useState<Interest | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [cursosData, interestsData] = await Promise.all([
        api.get('/api/cursos'),
        api.get('/api/pipeline')
      ]);
      setCursos(cursosData);
      setInterests(interestsData);
    } catch (error) {
      console.error('Erro ao carregar pipeline:', error);
    }
  }

  async function moveToStatus(interest: Interest, newStatus: string) {
    if (interest.status === newStatus) return;

    // Can't move to enrolled without a turma
    if (newStatus === 'enrolled' && !interest.turma_id) {
      toast.error('Aluno precisa estar vinculado a uma turma para ser matriculado');
      return;
    }

    try {
      await api.put(`/api/interests/${interest.id}/status`, { status: newStatus });
      toast.success(`Aluno movido para ${STATUS_CONFIG[newStatus].label}`);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao mover aluno');
    }
  }

  function handleDragStart(e: React.DragEvent, interest: Interest) {
    setDraggedItem(interest);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, column: string) {
    e.preventDefault();
    setDragOverColumn(column);
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  function handleDrop(e: React.DragEvent, column: string) {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedItem) {
      moveToStatus(draggedItem, column);
      setDraggedItem(null);
    }
  }

  const filtered = selectedCurso
    ? interests.filter(i => i.curso_id === selectedCurso)
    : interests;

  function getColumnItems(status: string) {
    return filtered.filter(i => i.status === status);
  }

  function daysSince(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / 86400000);
  }

  return (
    <div className="p-8 fade-in">
      <div className="max-w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Pipeline de Vendas</h1>
            <p className="text-gray-400 mt-2">Arraste os alunos entre as colunas para alterar o status</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={selectedCurso}
            onChange={(e) => setSelectedCurso(e.target.value)}
            className="bg-dark-card text-white px-4 py-2 rounded-xl border border-dark-lighter focus:ring-2 focus:ring-teal-accent outline-none text-sm"
          >
            <option value="">Todos os cursos</option>
            {cursos.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          <span className="text-gray-500 text-sm">{filtered.length} registros</span>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-3 gap-4 min-h-[60vh]">
          {COLUMNS.map(status => {
            const items = getColumnItems(status);
            const cfg = STATUS_CONFIG[status];
            const isDropTarget = dragOverColumn === status;

            return (
              <div
                key={status}
                className={`rounded-2xl border-2 transition-colors ${
                  isDropTarget ? 'border-teal-accent/50 bg-teal-accent/5' : `border-dark-lighter bg-dark-card/50`
                }`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column Header */}
                <div className="p-4 border-b border-dark-lighter">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold ${cfg.color}`}>{cfg.label}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full border ${cfg.bgColor} font-medium`}>
                      {items.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="p-3 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {items.map(interest => {
                    const days = daysSince(interest.created_at);
                    const isStale = status === 'interested' && days > 7;

                    return (
                      <div
                        key={interest.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, interest)}
                        className={`bg-dark-card rounded-xl p-3 cursor-grab active:cursor-grabbing border transition-all hover:border-gray-600 ${
                          isStale ? 'border-amber-500/40' : 'border-dark-lighter'
                        } ${draggedItem?.id === interest.id ? 'opacity-50' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-white text-sm font-medium truncate">{interest.aluno_nome}</span>
                          {isStale && (
                            <span className="text-amber-400 text-[9px] whitespace-nowrap ml-2">⚠ {days}d</span>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs truncate">{interest.curso_nome}</p>
                        {interest.aluno_whatsapp && (
                          <p className="text-gray-500 text-[10px] mt-1">📱 {interest.aluno_whatsapp}</p>
                        )}
                        {/* Quick actions */}
                        <div className="flex gap-1 mt-2">
                          {COLUMNS.filter(s => s !== status).map(targetStatus => (
                            <button
                              key={targetStatus}
                              onClick={() => moveToStatus(interest, targetStatus)}
                              className={`text-[9px] px-2 py-0.5 rounded-full border ${STATUS_CONFIG[targetStatus].bgColor} ${STATUS_CONFIG[targetStatus].color} hover:opacity-80 transition-opacity`}
                            >
                              → {STATUS_CONFIG[targetStatus].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {items.length === 0 && (
                    <div className="text-center py-8 text-gray-600 text-sm">
                      Arraste cards aqui
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
