import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, formatPhone } from '../utils/format';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ModalProfessor } from '../components/ModalProfessor';

interface Professor {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  valor_hora: number;
  unidade_id?: string;
  unidade_nome?: string;
  total_a_receber?: number;
  total_recebido?: number;
}

interface Unidade {
  id: string;
  nome: string;
}

export function Professores() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    valor_hora: '',
    unidade_id: ''
  });
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    professorId: '',
    professorNome: ''
  });

  useEffect(() => {
    loadProfessores();
    loadUnidades();
  }, []);

  async function loadProfessores() {
    try {
      const data = await api.get('/api/professores');
      setProfessores(data);
    } catch (error) {
      toast.error('Erro ao carregar professores');
    }
  }

  async function loadUnidades() {
    try {
      const data = await api.get('/api/unidades');
      setUnidades(data);
    } catch { /* ignore */ }
  }

  async function checkProfessorInUse(_professorId: string): Promise<boolean> {
    // The server-side delete endpoint checks this
    return false;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const professorData = {
        ...formData,
        valor_hora: Number(formData.valor_hora)
      };

      if (editingId) {
        await api.put(`/api/professores/${editingId}`, professorData);
        toast.success('Professor atualizado com sucesso!');
      } else {
        await api.post('/api/professores', professorData);
        toast.success('Professor adicionado com sucesso!');
      }

      setFormData({ nome: '', email: '', whatsapp: '', valor_hora: '', unidade_id: '' });
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
      await api.delete(`/api/professores/${confirmModal.professorId}`);
      toast.success('Professor excluído com sucesso!');
      loadProfessores();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir professor');
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
      valor_hora: professor.valor_hora.toString(),
      unidade_id: professor.unidade_id || ''
    });
    setEditingId(professor.id);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setFormData({ nome: '', email: '', whatsapp: '', valor_hora: '', unidade_id: '' });
    setEditingId(null);
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
                    <a 
                      href={`https://wa.me/${professor.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:text-green-300 transition-colors cursor-pointer flex items-center gap-1"
                      title="Abrir WhatsApp"
                    >
                      📱 {formatPhone(professor.whatsapp)}
                    </a>
                    <p className="text-teal-accent font-semibold">
                      {formatCurrency(professor.valor_hora)}/hora
                    </p>
                    {professor.unidade_nome && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-accent/10 text-teal-accent text-xs rounded-full">
                        📍 {professor.unidade_nome}
                      </span>
                    )}
                    {(professor.total_a_receber !== undefined && professor.total_recebido !== undefined) && (
                      <div className="space-y-1 pt-2 border-t border-gray-700">
                        {professor.total_a_receber > 0 && (
                          <p className="text-yellow-400 font-medium text-sm">
                            A receber: {formatCurrency(professor.total_a_receber)}
                          </p>
                        )}
                        {professor.total_recebido > 0 && (
                          <p className="text-emerald-400 font-medium text-sm">
                            Já recebido: {formatCurrency(professor.total_recebido)}
                          </p>
                        )}
                        {professor.total_a_receber === 0 && professor.total_recebido === 0 && (
                          <p className="text-gray-500 text-sm">
                            Nenhuma turma atribuída
                          </p>
                        )}
                      </div>
                    )}
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

        <ModalProfessor
          isOpen={isModalOpen}
          editingId={editingId}
          formData={formData}
          setFormData={setFormData}
          unidades={unidades}
          onSubmit={handleSubmit}
          onClose={handleCloseModal}
        />

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