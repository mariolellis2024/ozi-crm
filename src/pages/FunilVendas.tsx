import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Columns, AlertCircle, TrendingUp, Users, BookOpen, Calendar, DollarSign, Mail, Phone, Building } from 'lucide-react';
import { KanbanCard } from '../components/KanbanCard';
import { ModalInteresse } from '../components/ModalInteresse';
import { formatCurrency } from '../utils/format';

// Definição dos estágios de vendas (colunas do Kanban)
const SALES_STAGES = [
  { value: 'new_lead', label: 'Novo Lead', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'qualified', label: 'Qualificado', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'proposal_sent', label: 'Proposta Enviada', color: 'bg-indigo-500/20 text-indigo-400' },
  { value: 'negotiation', label: 'Negociação', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'enrolled', label: 'Matriculado', color: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'lost', label: 'Perdido', color: 'bg-red-500/20 text-red-400' },
];

// Interfaces para os dados
interface Aluno {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  empresa?: string;
}

interface Curso {
  id: string;
  nome: string;
  preco: number;
}

interface User {
  id: string;
  email: string;
}

interface Interest {
  id: string;
  aluno_id: string;
  curso_id: string;
  status: 'interested' | 'enrolled' | 'completed';
  sales_stage: 'new_lead' | 'qualified' | 'proposal_sent' | 'negotiation' | 'enrolled' | 'lost';
  last_contact_date?: string;
  notes?: string;
  expected_close_date?: string;
  lead_source?: 'website' | 'social_media' | 'referral' | 'advertising' | 'event' | 'cold_outreach' | 'other';
  assigned_to?: string;
  created_at: string;
  aluno: Aluno;
  curso: Curso;
  assigned_user?: User;
}

export function FunilVendas() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInterestId, setSelectedInterestId] = useState<string | null>(null);

  useEffect(() => {
    loadInterests();
  }, []);

  async function loadInterests() {
    setLoading(true);
    try {
      const { data: interestsData, error: interestsError } = await supabase
        .from('aluno_curso_interests')
        .select(`
          id,
          aluno_id,
          curso_id,
          status,
          sales_stage,
          last_contact_date,
          notes,
          expected_close_date,
          lead_source,
          assigned_to,
          created_at,
          aluno:alunos(id, nome, email, whatsapp, empresa),
          curso:cursos(id, nome, preco)
        `)
        .order('created_at', { ascending: true });

      if (interestsError) throw interestsError;
      
      // Para simplificar, vamos apenas exibir os interesses sem informações de usuário por enquanto
      setInterests(interestsData as Interest[]);
    } catch (error: any) {
      console.error('Erro ao carregar interesses:', error);
      toast.error(`Erro ao carregar funil: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  }

  const handleCardClick = (interestId: string) => {
    setSelectedInterestId(interestId);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedInterestId(null);
  };

  const handleInterestSave = () => {
    loadInterests(); // Recarrega os dados após salvar
  };

  // Agrupar interesses por estágio de vendas
  const interestsByStage = SALES_STAGES.reduce((acc, stage) => {
    acc[stage.value] = interests.filter(interest => interest.sales_stage === stage.value);
    return acc;
  }, {} as Record<string, Interest[]>);

  return (
    <div className="p-8 fade-in">
      <div className="max-w-full mx-auto">
        <div className="flex justify-between items-center mb-8 fade-in-delay-1">
          <div className="slide-in-left">
            <h1 className="text-3xl font-bold text-white">Funil de Vendas</h1>
            <p className="text-gray-400 mt-2">Visualize e gerencie o progresso dos leads de alunos</p>
          </div>
          {/* Futuros filtros e botões aqui */}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-accent border-t-transparent"></div>
            <span className="ml-4 text-white">Carregando funil...</span>
          </div>
        ) : (
          <div className="flex overflow-x-auto pb-4 space-x-6">
            {SALES_STAGES.map(stage => (
              <div key={stage.value} className="flex-shrink-0 w-80 bg-dark-card rounded-2xl p-4 shadow-lg">
                <div className={`flex items-center justify-between mb-4 p-2 rounded-lg ${stage.color}`}>
                  <h2 className="text-lg font-semibold">{stage.label}</h2>
                  <span className="text-sm font-medium">
                    {interestsByStage[stage.value]?.length || 0}
                  </span>
                </div>
                <div className="space-y-4 min-h-[100px]">
                  {interestsByStage[stage.value]?.length > 0 ? (
                    interestsByStage[stage.value].map(interest => (
                      <KanbanCard 
                        key={interest.id} 
                        interest={interest} 
                        onClick={() => handleCardClick(interest.id)} 
                      />
                    ))
                  ) : (
                    <div className="text-gray-500 text-center py-8">
                      Nenhum lead neste estágio.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalInteresse
        isOpen={modalOpen}
        onClose={handleModalClose}
        interestId={selectedInterestId}
        onSave={handleInterestSave}
      />
    </div>
  );
}