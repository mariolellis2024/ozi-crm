import React from 'react';
import { User, BookOpen, Calendar, DollarSign, Mail, Phone, Building, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/format';

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
}

interface KanbanCardProps {
  interest: Interest;
  onClick: () => void;
}

export function KanbanCard({ interest, onClick }: KanbanCardProps) {
  const getStatusColor = (status: Interest['status']) => {
    switch (status) {
      case 'interested': return 'bg-blue-500/20 text-blue-400';
      case 'enrolled': return 'bg-emerald-500/20 text-emerald-400';
      case 'completed': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div 
      className="bg-dark-lighter rounded-lg p-4 shadow-md cursor-pointer hover:bg-dark-card transition-colors hover-lift"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-white">{interest.aluno.nome}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(interest.status)}`}>
          {interest.status === 'interested' ? 'Interessado' : interest.status === 'enrolled' ? 'Matriculado' : 'Concluído'}
        </span>
      </div>
      
      <div className="space-y-1 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span>{interest.curso.nome}</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          <span>{formatCurrency(interest.curso.preco)}</span>
        </div>
        {interest.last_contact_date && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Último Contato: {formatDate(interest.last_contact_date)}</span>
          </div>
        )}
        {interest.expected_close_date && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Fechamento Previsto: {formatDate(interest.expected_close_date)}</span>
          </div>
        )}
        {interest.aluno.empresa && (
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span>{interest.aluno.empresa}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <span>{interest.aluno.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          <span>{interest.aluno.whatsapp}</span>
        </div>
      </div>
    </div>
  );
}