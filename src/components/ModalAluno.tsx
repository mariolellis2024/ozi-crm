import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { formatWhatsappInput, formatCepInput } from '../utils/format';
import { LoadingButton } from './LoadingButton';
import { InputField } from './InputField';
import toast from 'react-hot-toast';

type Period = 'manha' | 'tarde' | 'noite' | 'dia_inteiro';

interface Unidade {
  id: string;
  nome: string;
}

interface ModalAlunoProps {
  isOpen: boolean;
  editingId: string | null;
  formData: {
    nome: string;
    email: string;
    whatsapp: string;
    empresa: string;
    available_periods: Period[];
    unidade_id: string;
    genero: string;
    dataNascimento: string;
    cep: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    nome: string;
    email: string;
    whatsapp: string;
    empresa: string;
    available_periods: Period[];
    unidade_id: string;
    genero: string;
    dataNascimento: string;
    cep: string;
  }>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  togglePeriod: (period: Period) => void;
  unidades: Unidade[];
}

const PERIODS: { value: Period; label: string; color: string }[] = [
  { value: 'manha', label: 'Manhã', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30' },
  { value: 'tarde', label: 'Tarde', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30' },
  { value: 'noite', label: 'Noite', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30' },
  { value: 'dia_inteiro', label: 'Dia Inteiro', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30' }
];

export function ModalAluno({ 
  isOpen, 
  editingId, 
  formData, 
  setFormData, 
  onSubmit, 
  onClose,
  togglePeriod,
  unidades
}: ModalAlunoProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }
    if (!formData.whatsapp.trim()) {
      toast.error('O WhatsApp é obrigatório');
      return;
    }
    if (!formData.unidade_id) {
      toast.error('Selecione uma unidade');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  return createPortal(
    isOpen ? (
    <div 
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-dark-card rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">
            {editingId ? 'Editar Aluno' : 'Novo Aluno'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            id="nome"
            label="Nome"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            required
          />

          <InputField
            id="email"
            type="email"
            label="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required={false}
          />

          <InputField
            id="whatsapp"
            type="tel"
            label="WhatsApp"
            value={formData.whatsapp}
            onChange={(e) => setFormData({ ...formData, whatsapp: formatWhatsappInput(e.target.value) })}
            placeholder="(11) 99999-9999"
            required
          />

          <InputField
            id="empresa"
            label="Empresa"
            value={formData.empresa}
            onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
            required={false}
          />

          {/* Unidade select */}
          <div>
            <label htmlFor="unidade_id" className="block text-sm font-medium text-gray-400 mb-1">
              Unidade
            </label>
            <select
              id="unidade_id"
              value={formData.unidade_id}
              onChange={(e) => setFormData({ ...formData, unidade_id: e.target.value })}
              className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
              required
            >
              <option value="">Selecione a unidade</option>
              {unidades.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          {/* Gender */}
          <div>
            <label htmlFor="genero" className="block text-sm font-medium text-gray-400 mb-1">
              Gênero
            </label>
            <select
              id="genero"
              value={formData.genero}
              onChange={(e) => setFormData({ ...formData, genero: e.target.value })}
              className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
            >
              <option value="">Não informado</option>
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          {/* Data de Nascimento */}
          <InputField
            id="dataNascimento"
            type="date"
            label="Data de Nascimento"
            value={formData.dataNascimento}
            onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
            required={false}
          />

          {/* CEP */}
          <InputField
            id="cep"
            label="CEP"
            value={formData.cep}
            onChange={(e) => setFormData({ ...formData, cep: formatCepInput(e.target.value) })}
            placeholder="00000-000"
            maxLength={9}
            required={false}
          />

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Horários Disponíveis
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PERIODS.map(period => (
                <button
                  key={period.value}
                  type="button"
                  onClick={() => togglePeriod(period.value)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                    formData.available_periods.includes(period.value)
                      ? 'bg-teal-accent text-dark border border-teal-accent'
                      : `border ${period.color}`
                  }`}
                >
                  <span className="text-sm">{period.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Selecione os horários em que o aluno pode participar dos cursos
            </p>
          </div>

          <LoadingButton
            isLoading={isSubmitting}
            text={editingId ? 'Atualizar' : 'Cadastrar'}
            className="w-full bg-teal-accent text-dark font-medium rounded-lg px-4 py-2 hover:bg-teal-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </form>
      </div>
    </div>
    ) : null,
    document.body
  );
}