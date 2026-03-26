import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2, MapPin, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface Unidade {
  id: string;
  nome: string;
  cidade: string;
  endereco: string;
  total_salas: number;
  total_turmas: number;
}

export function Unidades() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: '', cidade: '', endereco: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: '', nome: '' });

  useEffect(() => { loadUnidades(); }, []);

  async function loadUnidades() {
    try {
      const data = await api.get('/api/unidades');
      setUnidades(data);
    } catch { toast.error('Erro ao carregar unidades'); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/api/unidades/${editingId}`, formData);
        toast.success('Unidade atualizada!');
      } else {
        await api.post('/api/unidades', formData);
        toast.success('Unidade criada!');
      }
      setIsModalOpen(false);
      setFormData({ nome: '', cidade: '', endereco: '' });
      setEditingId(null);
      loadUnidades();
    } catch { toast.error('Erro ao salvar unidade'); }
  }

  function handleEdit(u: Unidade) {
    setFormData({ nome: u.nome, cidade: u.cidade || '', endereco: u.endereco || '' });
    setEditingId(u.id);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setFormData({ nome: '', cidade: '', endereco: '' });
    setEditingId(null);
  }

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Unidades</h1>
            <p className="text-gray-400 mt-2">Gerencie as unidades da escola</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors hover-glow"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nova Unidade
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {unidades.map((u) => (
            <div key={u.id} className="bg-dark-card rounded-2xl p-6 hover-lift hover-scale-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-5 w-5 text-teal-accent" />
                    <h3 className="text-xl font-semibold text-white">{u.nome}</h3>
                  </div>
                  {u.cidade && (
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <MapPin className="h-3 w-3" />
                      {u.cidade}
                    </div>
                  )}
                  {u.endereco && (
                    <p className="text-gray-500 text-xs mt-1">{u.endereco}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => handleEdit(u)} className="p-2 text-gray-400 hover:text-white transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConfirmModal({ isOpen: true, id: u.id, nome: u.nome })}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex gap-4 mt-3 pt-3 border-t border-gray-700">
                <div className="text-center">
                  <span className="text-white font-bold text-lg">{parseInt(String(u.total_salas))}</span>
                  <p className="text-gray-400 text-xs">Salas</p>
                </div>
                <div className="text-center">
                  <span className="text-white font-bold text-lg">{parseInt(String(u.total_turmas))}</span>
                  <p className="text-gray-400 text-xs">Turmas</p>
                </div>
              </div>
            </div>
          ))}
          {unidades.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-8">
              Nenhuma unidade cadastrada
            </div>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={handleCloseModal}>
            <div className="bg-dark-card rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {editingId ? 'Editar Unidade' : 'Nova Unidade'}
                </h2>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nome *</label>
                  <input
                    required
                    value={formData.nome}
                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full bg-dark-lighter text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-teal-accent outline-none"
                    placeholder="Ex: Brasília"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Cidade</label>
                  <input
                    value={formData.cidade}
                    onChange={e => setFormData({ ...formData, cidade: e.target.value })}
                    className="w-full bg-dark-lighter text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-teal-accent outline-none"
                    placeholder="Ex: Brasília - DF"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Endereço</label>
                  <input
                    value={formData.endereco}
                    onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                    className="w-full bg-dark-lighter text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-teal-accent outline-none"
                    placeholder="Rua, número, bairro..."
                  />
                </div>
                <button type="submit" className="w-full bg-teal-accent text-dark py-2 rounded-lg font-medium hover:bg-teal-accent/90 transition-colors">
                  {editingId ? 'Atualizar' : 'Criar'}
                </button>
              </form>
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title="Excluir Unidade"
          message={`Tem certeza que deseja excluir a unidade "${confirmModal.nome}"?`}
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={async () => {
            try {
              await api.delete(`/api/unidades/${confirmModal.id}`);
              toast.success('Unidade excluída!');
              loadUnidades();
            } catch (err: any) {
              toast.error(err.message || 'Erro ao excluir unidade');
            } finally {
              setConfirmModal({ isOpen: false, id: '', nome: '' });
            }
          }}
          onCancel={() => setConfirmModal({ isOpen: false, id: '', nome: '' })}
          variant="danger"
        />
      </div>
    </div>
  );
}
