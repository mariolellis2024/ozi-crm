import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Users, BookOpen, UserMinus, AlertTriangle, FileSignature, Copy, ExternalLink, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatPhone } from '../utils/format';

interface AlunoMatriculado {
  id: string;
  nome: string;
  email?: string;
  whatsapp: string;
  empresa?: string;
  enrolled_by_name?: string;
}

interface Contrato {
  id: string;
  sign_url: string;
  status: string;
  signed_at: string | null;
}

interface ModalAlunosMatriculadosProps {
  isOpen: boolean;
  onClose: () => void;
  turmaId: string;
  cursoId: string;
  cursoNome: string;
  cursoPreco: number;
  onStudentUnenrolled: () => void;
}

const CONTRACT_STATUS: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'text-amber-400' },
  signed: { label: 'Assinado', icon: CheckCircle, color: 'text-emerald-400' },
  refused: { label: 'Recusado', icon: XCircle, color: 'text-red-400' },
  expired: { label: 'Expirado', icon: XCircle, color: 'text-gray-400' },
};

export function ModalAlunosMatriculados({ 
  isOpen, 
  onClose, 
  turmaId, 
  cursoId, 
  cursoNome,
  cursoPreco,
  onStudentUnenrolled
}: ModalAlunosMatriculadosProps) {
  const [alunosMatriculados, setAlunosMatriculados] = useState<AlunoMatriculado[]>([]);
  const [filteredAlunos, setFilteredAlunos] = useState<AlunoMatriculado[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [unenrollingStudents, setUnenrollingStudents] = useState<Set<string>>(new Set());
  const [generatingContract, setGeneratingContract] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Record<string, Contrato>>({});
  const [confirmUnenroll, setConfirmUnenroll] = useState<{
    isOpen: boolean;
    alunoId: string;
    alunoNome: string;
    deletePayments: boolean;
  }>({
    isOpen: false,
    alunoId: '',
    alunoNome: '',
    deletePayments: true
  });

  useEffect(() => {
    if (isOpen) {
      loadAlunosMatriculados();
    }
  }, [isOpen, turmaId]);

  useEffect(() => {
    // Filter students based on search term
    const filtered = alunosMatriculados.filter(aluno =>
      aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aluno.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aluno.whatsapp.includes(searchTerm)
    );
    setFilteredAlunos(filtered);
  }, [alunosMatriculados, searchTerm]);

  async function loadAlunosMatriculados() {
    setLoading(true);
    try {
      const data = await api.get(`/api/interests/turma/${turmaId}/enrolled`);
      setAlunosMatriculados(data);
      
      // Load contracts for each student
      const contractMap: Record<string, Contrato> = {};
      for (const aluno of data) {
        try {
          const contrato = await api.get(`/api/contratos/by-enrollment/${aluno.id}/${turmaId}`);
          if (contrato) contractMap[aluno.id] = contrato;
        } catch {}
      }
      setContracts(contractMap);
    } catch (error) {
      toast.error('Erro ao carregar alunos matriculados');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateContract(alunoId: string) {
    setGeneratingContract(alunoId);
    try {
      const contrato = await api.post('/api/contratos/generate', {
        aluno_id: alunoId,
        turma_id: turmaId
      });
      setContracts(prev => ({ ...prev, [alunoId]: contrato }));
      if (contrato.sign_url) {
        await navigator.clipboard.writeText(contrato.sign_url);
        toast.success('Contrato gerado! Link copiado para a área de transferência.');
      } else {
        toast.success('Contrato gerado!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar contrato');
    } finally {
      setGeneratingContract(null);
    }
  }

  function handleCopyLink(url: string) {
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  }

  function handleUnenrollClick(alunoId: string, alunoNome: string) {
    setConfirmUnenroll({
      isOpen: true,
      alunoId,
      alunoNome,
      deletePayments: true
    });
  }

  async function handleConfirmUnenroll() {
    const { alunoId } = confirmUnenroll;
    setUnenrollingStudents(prev => new Set(prev).add(alunoId));
    
    try {
      await api.put('/api/interests/unenroll', {
        aluno_id: alunoId,
        curso_id: cursoId
      });
      
      toast.success('Aluno removido da turma com sucesso!');
      
      // Delete associated payments if requested
      if (confirmUnenroll.deletePayments) {
        try {
          await api.delete(`/api/pagamentos/by-enrollment/${alunoId}/${turmaId}`);
        } catch (err) {
          console.warn('Pagamentos não removidos:', err);
        }
      }
      
      setAlunosMatriculados(prev => prev.filter(aluno => aluno.id !== alunoId));
      onStudentUnenrolled();
    } catch (error) {
      toast.error('Erro ao remover aluno da turma');
    } finally {
      setUnenrollingStudents(prev => {
        const newSet = new Set(prev);
        newSet.delete(alunoId);
        return newSet;
      });
      setConfirmUnenroll({
        isOpen: false,
        alunoId: '',
        alunoNome: '',
        deletePayments: true
      });
    }
  }

  function handleCancelUnenroll() {
    setConfirmUnenroll({
      isOpen: false,
      alunoId: '',
      alunoNome: '',
      deletePayments: true
    });
  }

  function handleClose() {
    setSearchTerm('');
    onClose();
  }

  return createPortal(
    isOpen ? (
    <div 
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-dark-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-green-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Alunos Matriculados</h2>
              <p className="text-gray-400 text-sm">{cursoNome}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-lighter border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-400 border-t-transparent"></div>
            </div>
          ) : filteredAlunos.length > 0 ? (
            <div className="space-y-3">
               {filteredAlunos.map((aluno) => {
                const contrato = contracts[aluno.id];
                const statusCfg = contrato ? CONTRACT_STATUS[contrato.status] || CONTRACT_STATUS.pending : null;
                const StatusIcon = statusCfg?.icon;
                
                return (
                <div key={aluno.id} className="bg-dark-lighter rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="h-4 w-4 text-green-400" />
                        <h3 className="font-semibold text-white">{aluno.nome}</h3>
                      </div>
                      <div className="space-y-1 text-sm text-gray-400">
                        {aluno.email && <div>📧 {aluno.email}</div>}
                        <a 
                          href={`https://wa.me/${aluno.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 hover:text-green-300 transition-colors cursor-pointer flex items-center gap-1"
                          title="Abrir WhatsApp"
                        >
                          📱 {formatPhone(aluno.whatsapp)}
                        </a>
                        {aluno.empresa && <div>🏢 {aluno.empresa}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {aluno.enrolled_by_name && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-accent/10 border border-teal-accent/20 text-teal-accent text-xs font-medium mr-2" title="Matriculado por">
                          <Users className="h-3.5 w-3.5" />
                          <span>Matriculado por {aluno.enrolled_by_name.split(' ')[0]}</span>
                        </div>
                      )}
                      
                      {/* Contract button / status */}
                      {contrato ? (
                        <div className="flex items-center gap-1.5">
                          {StatusIcon && <StatusIcon className={`h-4 w-4 ${statusCfg?.color}`} />}
                          <span className={`text-xs font-medium ${statusCfg?.color}`}>{statusCfg?.label}</span>
                          {contrato.sign_url && contrato.status === 'pending' && (
                            <>
                              <button onClick={() => handleCopyLink(contrato.sign_url)} className="p-1.5 text-gray-400 hover:text-teal-accent transition-colors" title="Copiar link">
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <a href={contrato.sign_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-teal-accent transition-colors" title="Abrir link">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGenerateContract(aluno.id)}
                          disabled={generatingContract === aluno.id}
                          className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          title="Gerar contrato via ZapSign"
                        >
                          {generatingContract === aluno.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileSignature className="h-3.5 w-3.5" />
                          )}
                          <span>{generatingContract === aluno.id ? 'Gerando...' : 'Contrato'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleUnenrollClick(aluno.id, aluno.nome)}
                        disabled={unenrollingStudents.has(aluno.id)}
                        className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 bg-red-500 text-white hover:bg-red-600"
                      >
                        {unenrollingStudents.has(aluno.id) ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Removendo...
                          </>
                        ) : (
                          <>
                            <UserMinus className="h-4 w-4" />
                            Remover
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              {searchTerm ? (
                <div>
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                  <p>Nenhum aluno encontrado com "{searchTerm}"</p>
                </div>
              ) : (
                <div>
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                  <p>Nenhum aluno matriculado nesta turma</p>
                </div>
              )}
            </div>
          )}
        </div>

        {filteredAlunos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-400">
                <div>{filteredAlunos.length} aluno{filteredAlunos.length !== 1 ? 's' : ''} matriculado{filteredAlunos.length !== 1 ? 's' : ''}</div>
              </div>
              <span className="text-emerald-400 font-semibold">
                Faturamento: {formatCurrency(cursoPreco * filteredAlunos.length)}
              </span>
            </div>
          </div>
        )}

        {/* Modal de Confirmação */}
        {confirmUnenroll.isOpen && (
          <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-dark-card rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <h3 className="text-xl font-semibold text-white">Confirmar Remoção</h3>
              </div>
              
              <p className="text-gray-300 mb-4">
                Tem certeza que deseja remover <strong>{confirmUnenroll.alunoNome}</strong> desta turma?
                <br />
                <span className="text-sm text-gray-400 mt-2 block">
                  O aluno voltará para a lista de interessados no curso.
                </span>
              </p>

              <label className="flex items-center gap-3 mb-6 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={confirmUnenroll.deletePayments}
                  onChange={e => setConfirmUnenroll(prev => ({ ...prev, deletePayments: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-600 bg-dark-lighter text-red-500 focus:ring-red-500"
                />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                  Remover também os pagamentos/parcelas deste aluno nesta turma
                </span>
              </label>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelUnenroll}
                  className="px-4 py-2 bg-dark-lighter text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmUnenroll}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Remover da Turma
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    ) : null,
    document.body
  );
}