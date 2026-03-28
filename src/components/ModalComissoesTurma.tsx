import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, DollarSign, Users } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';

interface Comissao {
  user_id: string;
  user_name: string;
  vendas: number;
  valor_total_vendido: number;
  comissao: number;
}

interface ModalComissoesTurmaProps {
  isOpen: boolean;
  onClose: () => void;
  turmaId: string;
  cursoNome: string;
  cursoPreco: number;
}

export function ModalComissoesTurma({
  isOpen,
  onClose,
  turmaId,
  cursoNome,
  cursoPreco
}: ModalComissoesTurmaProps) {
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadComissoes();
    }
  }, [isOpen, turmaId]);

  async function loadComissoes() {
    setLoading(true);
    try {
      // Get all enrolled students for this turma
      const estudantes = await api.get(`/api/interests/turma/${turmaId}/enrolled`);
      
      // Calculate comissions locally since we have everything we need
      const comissoesMap = new Map<string, Comissao>();
      
      estudantes.forEach((estudante: any) => {
        if (estudante.enrolled_by_name) {
          const nomeVendedor = estudante.enrolled_by_name.split(' ')[0]; // Use first name
          if (!comissoesMap.has(nomeVendedor)) {
            comissoesMap.set(nomeVendedor, {
              user_id: 'unknown',
              user_name: nomeVendedor,
              vendas: 0,
              valor_total_vendido: 0,
              comissao: 0
            });
          }
          
          const com = comissoesMap.get(nomeVendedor)!;
          com.vendas += 1;
          com.valor_total_vendido += cursoPreco;
          com.comissao += (cursoPreco * 0.02); // 2% commission
        }
      });
      
      setComissoes(Array.from(comissoesMap.values()));
    } catch (error) {
      toast.error('Erro ao carregar comissões');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const totalComissoes = comissoes.reduce((acc, curr) => acc + curr.comissao, 0);
  const totalVendido = comissoes.reduce((acc, curr) => acc + curr.valor_total_vendido, 0);

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4 fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-dark-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Comissões da Turma</h2>
              <p className="text-gray-400 text-sm">{cursoNome}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-400 border-t-transparent"></div>
            </div>
          ) : comissoes.length > 0 ? (
            <div className="space-y-3">
               {comissoes.map((com, index) => (
                <div key={index} className="bg-dark-lighter rounded-lg p-5 border border-gray-700">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-dark p-3 rounded-full">
                        <Users className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{com.user_name}</h3>
                        <p className="text-sm text-gray-400">{com.vendas} venda{com.vendas > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div>
                        <p className="text-gray-400 mb-1">Total Vendido</p>
                        <p className="text-white font-medium">{formatCurrency(com.valor_total_vendido)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Comissão (2%)</p>
                        <p className="text-purple-400 font-bold">{formatCurrency(com.comissao)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="bg-dark-lighter w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-gray-500" />
              </div>
              <p>Nenhuma comissão registrada para os alunos matriculados nesta turma.</p>
              <p className="text-sm mt-2">As vendas precisam ter o registro do usuário que realizou a matrícula.</p>
            </div>
          )}
        </div>

        {comissoes.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-700 bg-dark rounded-xl p-4">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-gray-400">Total Vendido (Comissionado)</span>
              <span className="text-white font-medium">{formatCurrency(totalVendido)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Total em Comissões (2%)</span>
              <span className="text-purple-400 font-bold text-lg">{formatCurrency(totalComissoes)}</span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
