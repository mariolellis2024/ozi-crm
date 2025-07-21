import React from 'react';
import { createPortal } from 'react-dom';
import { X, Sun, Sunset, Moon } from 'lucide-react';

type Period = 'manha' | 'tarde' | 'noite';

interface ModalAlunoProps {
  isOpen: boolean;
  editingId: string | null;
  formData: {
    nome: string;
    email: string;
    whatsapp: string;
    empresa: string;
    available_periods: Period[];
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    nome: string;
    email: string;
    whatsapp: string;
    empresa: string;
    available_periods: Period[];
  }>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  togglePeriod: (period: Period) => void;
}

const PERIODS: { value: Period; label: string; icon: typeof Sun }[] = [
  { value: 'manha', label: 'Manhã', icon: Sun },
  { value: 'tarde', label: 'Tarde', icon: Sunset },
  { value: 'noite', label: 'Noite', icon: Moon }
];

export function ModalAluno({ 
  isOpen, 
  editingId, 
  formData, 
  setFormData, 
  onSubmit, 
  onClose,
  togglePeriod
}: ModalAlunoProps) {

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
            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
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
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
              required
            />
          </div>

          <div>
            <label htmlFor="empresa" className="block text-sm font-medium text-gray-400 mb-1">
              Empresa
            </label>
            <input
              type="text"
              id="empresa"
              value={formData.empresa}
              onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
              className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
            />
          </div>

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
                      ? 'bg-teal-accent text-dark'
                      : 'bg-dark-lighter text-gray-400 hover:text-white hover:bg-dark-card'
                  }`}
                >
                  <period.icon className="h-4 w-4" />
                  <span className="text-sm">{period.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Selecione os horários em que o aluno pode participar dos cursos
            </p>
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