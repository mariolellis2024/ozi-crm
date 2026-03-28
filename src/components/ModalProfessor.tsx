import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { formatWhatsappInput } from '../utils/format';
import { LoadingButton } from './LoadingButton';

interface ModalProfessorProps {
  isOpen: boolean;
  editingId: string | null;
  formData: {
    nome: string;
    email: string;
    whatsapp: string;
    valor_hora: string;
    unidade_id: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    nome: string;
    email: string;
    whatsapp: string;
    valor_hora: string;
    unidade_id: string;
  }>>;
  unidades: Array<{ id: string; nome: string }>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function ModalProfessor({ 
  isOpen, 
  editingId, 
  formData, 
  setFormData, 
  unidades,
  onSubmit, 
  onClose 
}: ModalProfessorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        className="bg-dark-card rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">
            {editingId ? 'Editar Professor' : 'Novo Professor'}
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
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-gray-400 mb-1">
              Nome
            </label>
            <input
              type="text"
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
              required
            />
          </div>

          <div>
            <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-400 mb-1">
              WhatsApp
            </label>
            <input
              type="tel"
              id="whatsapp"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: formatWhatsappInput(e.target.value) })}
              placeholder="(11) 99999-9999"
              className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
              required
            />
          </div>

          <div>
            <label htmlFor="valor_hora" className="block text-sm font-medium text-gray-400 mb-1">
              Valor da Hora
            </label>
            <input
              type="number"
              id="valor_hora"
              value={formData.valor_hora}
              onChange={(e) => setFormData({ ...formData, valor_hora: e.target.value })}
              className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label htmlFor="unidade_id" className="block text-sm font-medium text-gray-400 mb-1">
              Unidade
            </label>
            <select
              id="unidade_id"
              value={formData.unidade_id}
              onChange={(e) => setFormData({ ...formData, unidade_id: e.target.value })}
              className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
            >
              <option value="">Sem unidade</option>
              {unidades.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
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