import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, TrendingUp, Calendar, Phone, Mail, MessageCircle, Plus, Eye, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';

type SalesStage = 'new_lead' | 'qualified' | 'proposal_sent' | 'negotiation' | 'enrolled' | 'lost';
type LeadSource = 'website' | 'social_media' | 'referral' | 'advertising' | 'event' | 'cold_outreach' | 'other';

interface Lead {
  id: string;
  aluno_id: string;
  curso_id: string;
  sales_stage: SalesStage;
  last_contact_date?: string;
  notes?: string;
  expected_close_date?: string;
  lead_source: LeadSource;
  aluno: {
    nome: string;
    email?: string;
    whatsapp: string;
  };
  curso: {
    nome: string;
    preco: number;
  };
  interactions?: Array<{
    id: string;
    interaction_type: string;
    subject?: string;
    interaction_date: string;
  }>;
}

interface FunnelStage {
  stage: SalesStage;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Users;
}

const FUNNEL_STAGES: FunnelStage[] = [
  {
    stage: 'new_lead',
    label: 'Novos Leads',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: Users
  },
  {
    stage: 'qualified',
    label: 'Qualificados',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    icon: TrendingUp
  },
  {
    stage: 'proposal_sent',
    label: 'Proposta Enviada',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    icon: Mail
  },
  {
    stage: 'negotiation',
    label: 'Negociação',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    icon: MessageCircle
  },
  {
    stage: 'enrolled',
    label: 'Matriculados',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: Users
  }
];

const INTERACTION_ICONS = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  whatsapp: MessageCircle,
  other: MessageCircle
};

export function SalesFunnel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('aluno_curso_interests')
        .select(`
          *,
          aluno:alunos(nome, email, whatsapp),
          curso:cursos(nome, preco),
          interactions:lead_interactions(
            id,
            interaction_type,
            subject,
            interaction_date
          )
        `)
        .in('sales_stage', ['new_lead', 'qualified', 'proposal_sent', 'negotiation', 'enrolled'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      toast.error('Erro ao carregar leads');
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateLeadStage(leadId: string, newStage: SalesStage) {
    try {
      const { error } = await supabase
        .from('aluno_curso_interests')
        .update({ 
          sales_stage: newStage,
          last_contact_date: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;
      
      toast.success('Estágio atualizado com sucesso!');
      loadLeads();
    } catch (error) {
      toast.error('Erro ao atualizar estágio');
      console.error('Error updating stage:', error);
    }
  }

  function getLeadsByStage(stage: SalesStage): Lead[] {
    return leads.filter(lead => lead.sales_stage === stage);
  }

  function calculateStageRevenue(stage: SalesStage): number {
    return getLeadsByStage(stage).reduce((total, lead) => total + lead.curso.preco, 0);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function getLastInteractionIcon(lead: Lead) {
    const lastInteraction = lead.interactions?.[0];
    if (!lastInteraction) return MessageCircle;
    
    const IconComponent = INTERACTION_ICONS[lastInteraction.interaction_type as keyof typeof INTERACTION_ICONS] || MessageCircle;
    return IconComponent;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-accent border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas do Funil */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total de Leads</p>
              <p className="text-xl font-bold text-white">{leads.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-dark-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Taxa de Conversão</p>
              <p className="text-xl font-bold text-white">
                {leads.length > 0 ? Math.round((getLeadsByStage('enrolled').length / leads.length) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-dark-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-accent/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-teal-accent" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Receita Potencial</p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(leads.reduce((total, lead) => total + lead.curso.preco, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Funil de Vendas */}
      <div className="bg-dark-card rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Funil de Vendas</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {FUNNEL_STAGES.map((stageConfig, index) => {
            const stageLeads = getLeadsByStage(stageConfig.stage);
            const stageRevenue = calculateStageRevenue(stageConfig.stage);
            const Icon = stageConfig.icon;
            
            return (
              <div key={stageConfig.stage} className="relative">
                {/* Seta entre estágios */}
                {index < FUNNEL_STAGES.length - 1 && (
                  <div className="hidden lg:block absolute -right-2 top-1/2 transform -translate-y-1/2 z-10">
                    <ArrowRight className="h-6 w-6 text-gray-600" />
                  </div>
                )}
                
                <div className={`${stageConfig.bgColor} ${stageConfig.borderColor} border rounded-xl p-4 h-full`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`h-5 w-5 ${stageConfig.color}`} />
                    <h3 className={`font-medium ${stageConfig.color}`}>
                      {stageConfig.label}
                    </h3>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Leads:</span>
                      <span className="text-white font-semibold">{stageLeads.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Valor:</span>
                      <span className={`font-semibold ${stageConfig.color}`}>
                        {formatCurrency(stageRevenue)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Lista de leads no estágio */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {stageLeads.slice(0, 5).map((lead) => {
                      const LastInteractionIcon = getLastInteractionIcon(lead);
                      
                      return (
                        <div
                          key={lead.id}
                          className="bg-dark-lighter rounded-lg p-3 cursor-pointer hover:bg-dark transition-colors"
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowLeadModal(true);
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white text-sm font-medium truncate">
                              {lead.aluno.nome}
                            </span>
                            <LastInteractionIcon className="h-3 w-3 text-gray-400" />
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {lead.curso.nome}
                          </div>
                          <div className="text-xs text-teal-accent font-medium">
                            {formatCurrency(lead.curso.preco)}
                          </div>
                        </div>
                      );
                    })}
                    
                    {stageLeads.length > 5 && (
                      <div className="text-center text-gray-400 text-xs py-2">
                        +{stageLeads.length - 5} mais
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Detalhes do Lead */}
      {showLeadModal && selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">
                Detalhes do Lead
              </h2>
              <button
                onClick={() => setShowLeadModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Informações do Lead */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Informações do Aluno</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-gray-400 text-sm">Nome:</span>
                      <p className="text-white">{selectedLead.aluno.nome}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Email:</span>
                      <p className="text-white">{selectedLead.aluno.email || 'Não informado'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">WhatsApp:</span>
                      <p className="text-white">{selectedLead.aluno.whatsapp}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Informações do Curso</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-gray-400 text-sm">Curso:</span>
                      <p className="text-white">{selectedLead.curso.nome}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Valor:</span>
                      <p className="text-teal-accent font-semibold">
                        {formatCurrency(selectedLead.curso.preco)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Último Contato:</span>
                      <p className="text-white">
                        {selectedLead.last_contact_date 
                          ? formatDate(selectedLead.last_contact_date)
                          : 'Nunca'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mudança de Estágio */}
              <div>
                <h3 className="text-lg font-medium text-white mb-3">Alterar Estágio</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {FUNNEL_STAGES.map((stage) => (
                    <button
                      key={stage.stage}
                      onClick={() => updateLeadStage(selectedLead.id, stage.stage)}
                      className={`p-3 rounded-lg border transition-colors ${
                        selectedLead.sales_stage === stage.stage
                          ? `${stage.bgColor} ${stage.borderColor} ${stage.color}`
                          : 'bg-dark-lighter border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                      }`}
                    >
                      <stage.icon className="h-4 w-4 mx-auto mb-1" />
                      <span className="text-xs">{stage.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Histórico de Interações */}
              {selectedLead.interactions && selectedLead.interactions.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Histórico de Interações</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedLead.interactions.map((interaction) => {
                      const InteractionIcon = INTERACTION_ICONS[interaction.interaction_type as keyof typeof INTERACTION_ICONS] || MessageCircle;
                      
                      return (
                        <div key={interaction.id} className="flex items-center gap-3 p-2 bg-dark-lighter rounded-lg">
                          <InteractionIcon className="h-4 w-4 text-gray-400" />
                          <div className="flex-1">
                            <p className="text-white text-sm">
                              {interaction.subject || `Interação via ${interaction.interaction_type}`}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {formatDate(interaction.interaction_date)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}