import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface Professor {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  valor_hora: number;
}

interface TurmaProfessor {
  id: string;
  turma_id: string;
  professor_id: string;
}

export function Professores() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    valor_hora: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    professorId: '',
    professorNome: ''
  });

  useEffect(() => {
    loadProfessores();
  }, []);

  async function loadProfessores() {
    try {
      const { data, error } = await supabase
        .from('professores')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProfessores(data);
    } catch (error) {
      toast.error('Erro ao carregar professores');
    }
  }

  async function checkProfessorInUse(professorId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('turma_professores')
      .select('id')
      .eq('professor_id', professorId)
      .limit(1);
    
    if (error) throw error;
    return data.length > 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const professorData = {
        ...formData,
        valor_hora: Number(formData.valor_hora)
      };

      if (editingId) {
        const { error } = await supabase
          .from('professores')
          .update(professorData)
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success('Professor atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('professores')
          .insert([professorData]);
        
        if (error) throw error;
        toast.success('Professor adicionado com sucesso!');
      }

      setFormData({ nome: '', email: '', whatsapp: '', valor_hora: '' });
      setEditingId(null);
      setIsModalOpen(false);
      loadProfessores();
    } catch (error) {
      toast.error('Erro ao salvar professor');
    }
  }

  async function handleDelete(id: string) {
    const professor = professores.find(p => p.id === id);
    if (!professor) return;

    try {
      const isInUse = await checkProfessorInUse(id);
      if (isInUse) {
        toast.error('Este professor não pode ser excluído pois está atribuído a uma ou mais turmas');
        return;
      }

      setConfirmModal({
        isOpen: true,
        professorId: id,
        professorNome: professor.nome
      });
    } catch (error) {
      toast.error('Erro ao excluir professor');
    }
  }

  async function handleConfirmDelete() {
    try {
      const { error } = await supabase
        .from('professores')
        .delete()
        .eq('id', confirmModal.professorId);
      
      if (error) throw error;
      toast.success('Professor excluído com sucesso!');
      loadProfessores();
    } catch (error) {
      toast.error('Erro ao excluir professor');
    } finally {
      setConfirmModal({ isOpen: false, professorId: '', professorNome: '' });
    }
  }

  function handleCancelDelete() {
    setConfirmModal({ isOpen: false, professorId: '', professorNome: '' });
  }

  function handleEdit(professor: Professor) {
    setFormData({
      nome: professor.nome,
      email: professor.email,
      whatsapp: professor.whatsapp,
      valor_hora: professor.valor_hora.toString()
    });
    setEditingId(professor.id);
    setIsModalOpen(true);
  }

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 fade-in-delay-1">
          <div className="slide-in-left">
            <h1 className="text-3xl font-bold text-white">Professores</h1>
            <p className="text-gray-400 mt-2">Gerencie o corpo docente e suas especialidades</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors hover-glow slide-in-right"
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Professor
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 scale-in-delay-1">
          {professores.map((professor) => (
            <div key={professor.id} className="bg-dark-card rounded-2xl p-6 hover-lift hover-scale-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{professor.nome}</h3>
                  <div className="space-y-2">
                    <p className="text-gray-400">{professor.email}</p>
                    <p className="text-gray-400">{professor.whatsapp}</p>
                    <p className="text-teal-accent font-semibold">
                      {formatCurrency(professor.valor_hora)}/hora
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(professor)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(professor.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-dark-card rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {editingId ? 'Editar Professor' : 'Novo Professor'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({ nome: '', email: '', whatsapp: '', valor_hora: '' });
                    setEditingId(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
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
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
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

                <button
                  type="submit"
                  className="w-full bg-teal-accent text-dark font-medium rounded-lg px-4 py-2 hover:bg-teal-accent/90 transition-colors"
                >
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </button>
              </form>
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title="Excluir Professor"
          message={`Tem certeza que deseja excluir o professor "${confirmModal.professorNome}"? Esta ação não pode ser desfeita.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          variant="danger"
        />
      </div>
    </div>
  );
}