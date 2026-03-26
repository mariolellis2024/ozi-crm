import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import { Pencil, Trash2, UserPlus, Mail, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export function Usuarios() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    userId: '',
    userName: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const data = await api.get('/api/users');
      setUsers(data);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    }
  }

  function handleEdit(user: UserData) {
    setEditingId(user.id);
    setFormData({
      email: user.email,
      full_name: user.full_name || '',
      password: '',
    });
    setIsModalOpen(true);
  }

  function handleNew() {
    setEditingId(null);
    setFormData({ email: '', full_name: '', password: '' });
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.email) {
      toast.error('Email é obrigatório');
      return;
    }

    if (!editingId && (!formData.password || formData.password.length < 6)) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/api/users/${editingId}`, formData);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await api.post('/api/users', formData);
        toast.success('Usuário criado com sucesso!');
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar usuário');
    }
  }

  async function handleConfirmDelete() {
    try {
      await api.delete(`/api/users/${confirmModal.userId}`);
      toast.success('Usuário excluído com sucesso!');
      setConfirmModal({ isOpen: false, userId: '', userName: '' });
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir usuário');
    }
  }

  return (
    <div className="p-8 fade-in">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Usuários</h1>
            <p className="text-gray-400 mt-2">Gerencie os usuários do sistema</p>
          </div>
          <button
            onClick={handleNew}
            className="bg-teal-accent text-dark px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-teal-400 transition-all duration-200 font-medium shadow-glow hover:shadow-glow-intense"
          >
            <UserPlus className="h-5 w-5" />
            Novo Usuário
          </button>
        </div>

        <div className="bg-dark-card rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-lighter">
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Nome</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Email</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Criado em</th>
                <th className="text-right py-4 px-6 text-gray-400 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-dark-lighter/50 hover:bg-dark-lighter/30 transition-colors">
                  <td className="py-4 px-6 text-white">{user.full_name || '—'}</td>
                  <td className="py-4 px-6 text-gray-300">{user.email}</td>
                  <td className="py-4 px-6 text-gray-400">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-gray-400 hover:text-teal-accent transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmModal({ isOpen: true, userId: user.id, userName: user.email })}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    Nenhum usuário cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 fade-in">
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-md scale-in">
            <h2 className="text-xl font-bold text-white mb-6">
              {editingId ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full bg-dark-lighter text-white pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-teal-accent outline-none"
                    placeholder="Nome do usuário"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-dark-lighter text-white pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-teal-accent outline-none"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {editingId ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    required={!editingId}
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-dark-lighter text-white pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-teal-accent outline-none"
                    placeholder={editingId ? '••••••' : 'Mínimo 6 caracteres'}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-dark-lighter text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-teal-accent text-dark font-medium hover:bg-teal-400 transition-colors"
                >
                  {editingId ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onCancel={() => setConfirmModal({ isOpen: false, userId: '', userName: '' })}
        onConfirm={handleConfirmDelete}
        title="Excluir Usuário"
        message={`Tem certeza que deseja excluir o usuário "${confirmModal.userName}"?`}
      />
    </div>
  );
}
