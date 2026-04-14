import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, UserCheck, Phone, Clock } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { formatPhone } from '../utils/format';

interface AlunoPreMatriculado {
  id: string;
  nome: string;
  email?: string;
  whatsapp: string;
  empresa?: string;
  interest_id: string;
  curso_id: string;
  reserved_at: string;
}

interface ModalPreMatriculadosProps {
  isOpen: boolean;
  onClose: () => void;
  turmaId: string;
  cursoId: string;
  cursoNome: string;
  cursoPreco: number;
  onDataChanged: () => void;
}

export function ModalPreMatriculados({
  isOpen,
  onClose,
  turmaId,
  cursoId,
  cursoNome,
  cursoPreco,
  onDataChanged
}: ModalPreMatriculadosProps) {
  const [alunos, setAlunos] = useState<AlunoPreMatriculado[]>([]);
  const [filteredAlunos, setFilteredAlunos] = useState<AlunoPreMatriculado[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrollingStudent, setEnrollingStudent] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) loadAlunos();
  }, [isOpen, turmaId]);

  useEffect(() => {
    const filtered = alunos.filter(a =>
      a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.whatsapp.includes(searchTerm)
    );
    setFilteredAlunos(filtered);
  }, [alunos, searchTerm]);

  async function loadAlunos() {
    setLoading(true);
    try {
      const data = await api.get(`/api/interests/turma/${turmaId}/pre-enrolled`);
      setAlunos(data);
    } catch (error) {
      toast.error('Erro ao carregar pré-matriculados');
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll(aluno: AlunoPreMatriculado) {
    setEnrollingStudent(aluno.id);
    try {
      await api.post('/api/interests/enroll', {
        aluno_id: aluno.id,
        curso_id: aluno.curso_id,
        turma_id: turmaId
      });
      toast.success(`${aluno.nome} matriculado(a) com sucesso! ✅`);
      setAlunos(prev => prev.filter(a => a.id !== aluno.id));
      onDataChanged();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao matricular aluno');
    } finally {
      setEnrollingStudent(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function handleClose() {
    setSearchTerm('');
    onClose();
  }

  return createPortal(
    isOpen ? (
      <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={handleClose}>
        <div className="bg-dark-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <UserCheck className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Pré-Matriculados</h2>
                <p className="text-gray-400 text-sm">{cursoNome}</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors" type="button">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Info banner */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 mb-4 text-sm text-amber-300">
            🎯 Essas pessoas reservaram vaga pela página pública. Entre em contato e efetive a matrícula!
          </div>

          {alunos.length > 3 && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, email ou WhatsApp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-dark-lighter border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-400 border-t-transparent"></div>
              </div>
            ) : filteredAlunos.length > 0 ? (
              <div className="space-y-3">
                {filteredAlunos.map((aluno) => (
                  <div key={aluno.id} className="bg-dark-lighter rounded-lg p-4 border border-amber-500/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-lg">{aluno.nome}</h3>
                        <div className="space-y-1 mt-2 text-sm text-gray-400">
                          <a
                            href={`https://wa.me/${aluno.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors font-medium"
                          >
                            <Phone className="h-4 w-4" />
                            {formatPhone(aluno.whatsapp)}
                          </a>
                          {aluno.email && <div>📧 {aluno.email}</div>}
                          {aluno.empresa && <div>🏢 {aluno.empresa}</div>}
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            Reservou em {formatDate(aluno.reserved_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <a
                          href={`https://wa.me/${aluno.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${aluno.nome.split(' ')[0]}! Vi que você reservou uma vaga no curso ${cursoNome}. Vamos finalizar sua matrícula? 🎯`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                          💬 WhatsApp
                        </a>
                        <button
                          onClick={() => handleEnroll(aluno)}
                          disabled={enrollingStudent === aluno.id}
                          className="px-4 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                          {enrollingStudent === aluno.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-dark border-t-transparent" />
                              Matriculando...
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4" />
                              Efetivar Matrícula
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                {searchTerm ? (
                  <div>
                    <Search className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                    <p>Nenhum pré-matriculado encontrado com "{searchTerm}"</p>
                  </div>
                ) : (
                  <div>
                    <UserCheck className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                    <p>Nenhum pré-matriculado nesta turma</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {filteredAlunos.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                {filteredAlunos.length} pessoa{filteredAlunos.length !== 1 ? 's' : ''} aguardando contato
              </div>
            </div>
          )}
        </div>
      </div>
    ) : null,
    document.body
  );
}
