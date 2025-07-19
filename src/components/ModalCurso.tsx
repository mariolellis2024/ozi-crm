import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalCursoProps {
  isOpen: boolean;
  editingId: string | null;
  formData: {
    nome: string;
    carga_horaria: string;
    preco: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    nome: string;
    carga_horaria: string;
    preco: string;
  }>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function ModalCurso({ 
  isOpen, 
  editingId, 
  formData, 
  setFormData, 
  onSubmit, 
  onClose 
}: ModalCursoProps) {
  if (!isOpen) return null;

  // Renderiza o modal diretamente no body, fora da hierarquia do Layout
  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div 
        className="bg-dark-card rounded-2xl p-6 w-full max-w-md shadow-xl transform transition-all"
        style={{
          borderRadius: '1rem',
          padding: '1.5rem',
          width: '100%',
          maxWidth: '28rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">
            {editingId ? 'Editar Curso' : 'Novo Curso'}
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
            <label htmlFor="carga_horaria" className="block text-sm font-medium text-gray-400 mb-1">
              Carga Horária (horas)
            </label>
            <input
              type="number"
              id="carga_horaria"
              value={formData.carga_horaria}
              onChange={(e) => setFormData({ ...formData, carga_horaria: e.target.value })}
              className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
              min="1"
              required
            />
          </div>

          <div>
            <label htmlFor="preco" className="block text-sm font-medium text-gray-400 mb-1">
              Preço
            </label>
            <input
              type="number"
              id="preco"
              value={formData.preco}
              onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
              className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
              min="0"
              step="0.01"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-teal-accent text-dark font-medium rounded-lg px-4 py-2 hover:bg-teal-accent/90 transition-colors"
          >
            {editingId ? 'Atualizar' : 'Cadastrar'}
          </button>
        </form>
      </div>
    </div>,
    document.body // Renderiza diretamente no body
  );
}