import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ModalSala } from '../components/ModalSala';

interface Sala {
  id: string;
  nome: string;
  cadeiras: number;
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
      const data = await api.get('/api/salas');
      setSalas(data);
    } catch (error) {
      toast.error('Erro ao carregar salas');
    }
  }



  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const salaData = {
        ...formData,
        cadeiras: Number(formData.cadeiras)
      };

      if (editingId) {
        await api.put(`/api/salas/${editingId}`, salaData);
        toast.success('Sala atualizada com sucesso!');
      } else {
        await api.post('/api/salas', salaData);
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
    const sala = salas.find((s: any) => s.id === id);
    if (!sala) return;

    setConfirmModal({
      isOpen: true,
      salaId: id,
      salaNome: sala.nome
    });
  }

  async function handleConfirmDelete() {
    try {
      await api.delete(`/api/salas/${confirmModal.salaId}`);
      toast.success('Sala excluída com sucesso!');
      loadSalas();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir sala');
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

  function handleCloseModal() {
    setIsModalOpen(false);
    setFormData({ nome: '', cadeiras: '' });
    setEditingId(null);
  }

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 fade-in-delay-1">
          <div className="slide-in-left">
            <h1 className="text-3xl font-bold text-white">Salas</h1>
            <p className="text-gray-400 mt-2">Gerencie os espaços físicos disponíveis</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors hover-glow slide-in-right"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nova Sala
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 scale-in-delay-1">
          {salas.map((sala) => (
            <div key={sala.id} className="bg-dark-card rounded-2xl p-6 hover-lift hover-scale-sm">
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

        <ModalSala
          isOpen={isModalOpen}
          editingId={editingId}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={handleCloseModal}
        />

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