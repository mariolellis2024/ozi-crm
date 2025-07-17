import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface Sala {
  id: string;
  nome: string;
  cadeiras: number;
}

interface Turma {
  id: string;
  sala_id: string;
}

export function Salas() {
  const [salas, setSalas] = useState<Sala[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    salaId: '',
    salaNome: ''
  });
  const [formData, setFormData] = useState({
    nome: '',
    cadeiras: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadSalas();
  }, []);

  async function loadSalas() {
    try {
      const { data, error } = await supabase
        .from('salas')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSalas(data);
    } catch (error) {
      toast.error('Erro ao carregar salas');
    }
  }

  async function checkSalaInUse(salaId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('turmas')
      .select('id')
      .eq('sala_id', salaId)
      .limit(1);
    
    if (error) throw error;
    return data.length > 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const salaData = {
        ...formData,
        cadeiras: Number(formData.cadeiras)
      };

      if (editingId) {
        const { error } = await supabase
          .from('salas')
          .update(salaData)
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success('Sala atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('salas')
          .insert([salaData]);
        
        if (error) throw error;
        toast.success('Sala adicionada com sucesso!');
      }

      setIsModalOpen(false);
      setFormData({ nome: '', cadeiras: '' });
      setEditingId(null);
      loadSalas();
    } catch (error) {
      toast.error('Erro ao salvar sala');
    }
  }

  async function handleDelete(id: string) {
    const sala = salas.find(s => s.id === id);
    if (!sala) return;

    try {
      const isInUse = await checkSalaInUse(id);
      if (isInUse) {
        toast.error('Esta sala não pode ser excluída pois está sendo usada em uma ou mais turmas');
        return;
      }

      setConfirmModal({
        isOpen: true,
        salaId: id,
        salaNome: sala.nome
      });
    } catch (error) {
      toast.error('Erro ao excluir sala');
    }
  }

  async function handleConfirmDelete() {
    try {
      const { error } = await supabase
        .from('salas')
        .delete()
        .eq('id', confirmModal.salaId);
      
      if (error) throw error;
      toast.success('Sala excluída com sucesso!');
      loadSalas();
    } catch (error) {
      toast.error('Erro ao excluir sala');
    } finally {
      setConfirmModal({ isOpen: false, salaId: '', salaNome: '' });
    }
  }

  function handleCancelDelete() {
    setConfirmModal({ isOpen: false, salaId: '', salaNome: '' });
  }

  function handleEdit(sala: Sala) {
    setFormData({
      nome: sala.nome,
      cadeiras: sala.cadeiras.toString()
    });
    setEditingId(sala.id);
    setIsModalOpen(true);
  }

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 fade-in-delay-1">
          <div>
            <h1 className="text-3xl font-bold text-white">Salas</h1>
            <p className="text-gray-400 mt-2">Gerencie os espaços físicos disponíveis</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors hover-scale"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nova Sala
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 fade-in-delay-2">
          {salas.map((sala) => (
            <div key={sala.id} className="bg-dark-card rounded-2xl p-6 hover-lift">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{sala.nome}</h3>
                  <p className="text-gray-400">
                    {sala.cadeiras} {sala.cadeiras === 1 ? 'cadeira' : 'cadeiras'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(sala)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(sala.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {salas.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-8">
              Nenhuma sala cadastrada
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-dark-card rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {editingId ? 'Editar Sala' : 'Nova Sala'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({ nome: '', cadeiras: '' });
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
          title="Excluir Sala"
          message={`Tem certeza que deseja excluir a sala "${confirmModal.salaNome}"? Esta ação não pode ser desfeita.`}
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