import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, BookOpen, Calendar, DollarSign, Mail, Phone, Building, Clock, MessageSquare, Tag, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
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

interface UserProfile {
  id: string;
  email: string; // Assuming users table has an email field
}

interface InterestFormData {
  aluno_id: string;
  curso_id: string;
  status: 'interested' | 'enrolled' | 'completed';
  sales_stage: 'new_lead' | 'qualified' | 'proposal_sent' | 'negotiation' | 'enrolled' | 'lost';
  last_contact_date: string;
  notes: string;
  expected_close_date: string;
  lead_source: 'website' | 'social_media' | 'referral' | 'advertising' | 'event' | 'cold_outreach' | 'other';
  assigned_to: string;
}

interface ModalInteresseProps {
  isOpen: boolean;
  onClose: () => void;
  interestId: string | null;
  onSave: () => void;
}

const SALES_STAGES_OPTIONS = [
  { value: 'new_lead', label: 'Novo Lead' },
  { value: 'qualified', label: 'Qualificado' },
  { value: 'proposal_sent', label: 'Proposta Enviada' },
  { value: 'negotiation', label: 'Negociação' },
  { value: 'enrolled', label: 'Matriculado' },
  { value: 'lost', label: 'Perdido' },
];

const LEAD_SOURCE_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'social_media', label: 'Mídias Sociais' },
  { value: 'referral', label: 'Indicação' },
  { value: 'advertising', label: 'Publicidade' },
  { value: 'event', label: 'Evento' },
  { value: 'cold_outreach', label: 'Prospecção Ativa' },
  { value: 'other', label: 'Outro' },
];

export function ModalInteresse({ isOpen, onClose, interestId, onSave }: ModalInteresseProps) {
  const [formData, setFormData] = useState<InterestFormData>({
    aluno_id: '',
    curso_id: '',
    status: 'interested',
    sales_stage: 'new_lead',
    last_contact_date: '',
    notes: '',
    expected_close_date: '',
    lead_source: 'website',
    assigned_to: '',
  });
  const [loading, setLoading] = useState(true);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]); // For assigned_to

  useEffect(() => {
    if (isOpen) {
      loadFormData();
      loadDropdownData();
    }
  }, [isOpen, interestId]);

  async function loadFormData() {
    if (!interestId) {
      setFormData({
        aluno_id: '',
        curso_id: '',
        status: 'interested',
        sales_stage: 'new_lead',
        last_contact_date: '',
        notes: '',
        expected_close_date: '',
        lead_source: 'website',
        assigned_to: '',
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('aluno_curso_interests')
        .select('*')
        .eq('id', interestId)
        .single();

      if (error) throw error;

      setFormData({
        aluno_id: data.aluno_id || '',
        curso_id: data.curso_id || '',
        status: data.status || 'interested',
        sales_stage: data.sales_stage || 'new_lead',
        last_contact_date: data.last_contact_date ? new Date(data.last_contact_date).toISOString().split('T') : '',
        notes: data.notes || '',
        expected_close_date: data.expected_close_date ? new Date(data.expected_close_date).toISOString().split('T') : '',
        lead_source: data.lead_source || 'website',
        assigned_to: data.assigned_to || '',
      });
    } catch (error: any) {
      console.error('Erro ao carregar dados do interesse:', error);
      toast.error('Erro ao carregar dados do interesse.');
    } finally {
      setLoading(false);
    }
  }

  async function loadDropdownData() {
    try {
      const [alunosResult, cursosResult, usersResult] = await Promise.all([
        supabase.from('alunos').select('id, nome').order('nome'),
        supabase.from('cursos').select('id, nome, preco').order('nome'),
        supabase.auth.admin.listUsers(),
      ]);

      if (alunosResult.error) throw alunosResult.error;
      if (cursosResult.error) throw cursosResult.error;
      if (usersResult.error) {
        console.warn('Erro ao carregar usuários:', usersResult.error);
        setAlunos(alunosResult.data);
        setCursos(cursosResult.data);
        setUsers([]);
        return;
      }

      setAlunos(alunosResult.data);
      setCursos(cursosResult.data);
      setUsers(usersResult.data.users.map(user => ({ id: user.id, email: user.email || 'Sem email' })));
    } catch (error: any) {
      console.error('Erro ao carregar dados para dropdowns:', error);
      toast.error('Erro ao carregar dados de seleção.');
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        last_contact_date: formData.last_contact_date || null,
        expected_close_date: formData.expected_close_date || null,
        assigned_to: formData.assigned_to || null,
      };

      if (interestId) {
        const { error } = await supabase
          .from('aluno_curso_interests')
          .update(dataToSave)
          .eq('id', interestId);
        if (error) throw error;
        toast.success('Interesse atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('aluno_curso_interests')
          .insert([dataToSave]);
        if (error) throw error;
        toast.success('Interesse criado com sucesso!');
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar interesse:', error);
      toast.error(`Erro ao salvar interesse: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedAluno = alunos.find(a => a.id === formData.aluno_id);
  const selectedCurso = cursos.find(c => c.id === formData.curso_id);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z- bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-dark-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">
            {interestId ? 'Detalhes do Interesse' : 'Novo Interesse'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-accent border-t-transparent"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="aluno_id" className="block text-sm font-medium text-gray-400 mb-1">
                  Aluno
                </label>
                <select
                  id="aluno_id"
                  name="aluno_id"
                  value={formData.aluno_id}
                  onChange={handleChange}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  required
                  disabled={!!interestId} // Disable if editing existing interest
                >
                  <option value="">Selecione um aluno</option>
                  {alunos.map(aluno => (
                    <option key={aluno.id} value={aluno.id}>
                      {aluno.nome}
                    </option>
                  ))}
                </select>
                {selectedAluno && (
                  <div className="mt-2 text-xs text-gray-400 space-y-1">
                    <div className="flex items-center gap-1"><Mail className="h-3 w-3"/> {selectedAluno.email}</div>
                    <div className="flex items-center gap-1"><Phone className="h-3 w-3"/> {selectedAluno.whatsapp}</div>
                    {selectedAluno.empresa && <div className="flex items-center gap-1"><Building className="h-3 w-3"/> {selectedAluno.empresa}</div>}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="curso_id" className="block text-sm font-medium text-gray-400 mb-1">
                  Curso
                </label>
                <select
                  id="curso_id"
                  name="curso_id"
                  value={formData.curso_id}
                  onChange={handleChange}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  required
                  disabled={!!interestId} // Disable if editing existing interest
                >
                  <option value="">Selecione um curso</option>
                  {cursos.map(curso => (
                    <option key={curso.id} value={curso.id}>
                      {curso.nome} ({formatCurrency(curso.preco)})
                    </option>
                  ))}
                </select>
                {selectedCurso && (
                  <div className="mt-2 text-xs text-gray-400 space-y-1">
                    <div className="flex items-center gap-1"><DollarSign className="h-3 w-3"/> {formatCurrency(selectedCurso.preco)}</div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="sales_stage" className="block text-sm font-medium text-gray-400 mb-1">
                  Estágio de Vendas
                </label>
                <select
                  id="sales_stage"
                  name="sales_stage"
                  value={formData.sales_stage}
                  onChange={handleChange}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  required
                >
                  {SALES_STAGES_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-400 mb-1">
                  Status do Interesse
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  required
                >
                  <option value="interested">Interessado</option>
                  <option value="enrolled">Matriculado</option>
                  <option value="completed">Concluído</option>
                </select>
              </div>

              <div>
                <label htmlFor="last_contact_date" className="block text-sm font-medium text-gray-400 mb-1">
                  Último Contato
                </label>
                <input
                  type="date"
                  id="last_contact_date"
                  name="last_contact_date"
                  value={formData.last_contact_date}
                  onChange={handleChange}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                />
              </div>

              <div>
                <label htmlFor="expected_close_date" className="block text-sm font-medium text-gray-400 mb-1">
                  Previsão de Fechamento
                </label>
                <input
                  type="date"
                  id="expected_close_date"
                  name="expected_close_date"
                  value={formData.expected_close_date}
                  onChange={handleChange}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                />
              </div>

              <div>
                <label htmlFor="lead_source" className="block text-sm font-medium text-gray-400 mb-1">
                  Fonte do Lead
                </label>
                <select
                  id="lead_source"
                  name="lead_source"
                  value={formData.lead_source}
                  onChange={handleChange}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  required
                >
                  {LEAD_SOURCE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-400 mb-1">
                  Responsável
                </label>
                <select
                  id="assigned_to"
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleChange}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                >
                  <option value="">Não atribuído</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-400 mb-1">
                Notas
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-teal-accent text-dark font-medium rounded-lg px-4 py-2 hover:bg-teal-accent/90 transition-colors"
              disabled={loading}
            >
              {loading ? 'Salvando...' : (interestId ? 'Atualizar Interesse' : 'Criar Interesse')}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}