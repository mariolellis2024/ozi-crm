import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalSalaProps {
  isOpen: boolean;
  editingId: string | null;
  formData: {
    nome: string;
    cadeiras: string;
    unidade_id: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    nome: string;
    cadeiras: string;
    unidade_id: string;
  }>>;
  unidades: Array<{ id: string; nome: string }>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function ModalSala({ 
  isOpen, 
  editingId, 
  formData, 
  setFormData, 
  unidades,
  onSubmit, 
  onClose 
}: ModalSalaProps) {

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
            {editingId ? 'Editar Sala' : 'Nova Sala'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
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
            <label htmlFor="cadeiras" className="block text-sm font-medium text-gray-400 mb-1">
              Número de Cadeiras
            </label>
            <input
              type="number"
              id="cadeiras"
              value={formData.cadeiras}
              onChange={(e) => setFormData({ ...formData, cadeiras: e.target.value })}
              className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
              min="1"
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

          <button
            type="submit"
            className="w-full bg-teal-accent text-dark font-medium rounded-lg px-4 py-2 hover:bg-teal-accent/90 transition-colors"
          >
            {editingId ? 'Atualizar' : 'Cadastrar'}
          </button>
        </form>
      </div>
    </div>
    ) : null,
    document.body
  );
}