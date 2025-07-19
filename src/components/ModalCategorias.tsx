import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Categoria {
  id: string;
  nome: string;
}

interface ModalCategoriasProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesUpdated: () => void;
}

export function ModalCategorias({ isOpen, onClose, onCategoriesUpdated }: ModalCategoriasProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nome: '' });

  useEffect(() => {
    if (isOpen) {
      loadCategorias();
    }
  }, [isOpen]);

  async function loadCategorias() {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      setCategorias(data);
    } catch (error) {
      toast.error('Erro ao carregar categorias');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        const { error } = await supabase
          .from('categorias')
          .update(formData)
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success('Categoria atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('categorias')
          .insert([formData]);
        
        if (error) throw error;
        toast.success('Categoria criada com sucesso!');
      }

      setFormData({ nome: '' });
      setEditingId(null);
      setShowForm(false);
      loadCategorias();
      onCategoriesUpdated();
    } catch (error) {
      toast.error('Erro ao salvar categoria');
    }
  }

  async function handleDelete(id: string) {
    try {
      // Check if category is being used
      const { data: cursosUsingCategory, error: checkError } = await supabase
        .from('cursos')
        .select('id')
        .eq('categoria_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (cursosUsingCategory.length > 0) {
        toast.error('Esta categoria não pode ser excluída pois está sendo usada por cursos');
        return;
      }

      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Categoria excluída com sucesso!');
      loadCategorias();
      onCategoriesUpdated();
    } catch (error) {
      toast.error('Erro ao excluir categoria');
    }
  }

  function handleEdit(categoria: Categoria) {
    setFormData({ nome: categoria.nome });
    setEditingId(categoria.id);
    setShowForm(true);
  }

  function handleCancelForm() {
    setFormData({ nome: '' });
    setEditingId(null);
    setShowForm(false);
  }

  function handleClose() {
    handleCancelForm();
    onClose();
  }

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-dark-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Tag className="h-6 w-6 text-teal-accent" />
            <h2 className="text-xl font-semibold text-white">Gerenciar Categorias</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova Categoria
          </button>
        </div>

        {showForm && (
          <div className="bg-dark-lighter rounded-lg p-4 border border-gray-700 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">
                {editingId ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button
                type="button"
                onClick={handleCancelForm}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="categoria_nome" className="block text-sm font-medium text-gray-400 mb-1">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  id="categoria_nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ nome: e.target.value })}
                  className="w-full bg-dark border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  required
                  placeholder="Digite o nome da categoria"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-teal-accent text-dark font-medium rounded-lg px-4 py-2 hover:bg-teal-accent/90 transition-colors"
                >
                  {editingId ? 'Atualizar Categoria' : 'Criar Categoria'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-4 py-2 bg-dark text-gray-400 rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div>
          <h3 className="text-lg font-medium text-white mb-4">Categorias Existentes</h3>
          <div className="space-y-3">
            {categorias.map(categoria => (
              <div key={categoria.id} className="flex items-center justify-between bg-dark-lighter rounded-lg px-4 py-3 border border-gray-700">
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-teal-accent" />
                  <span className="text-white font-medium">{categoria.nome}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(categoria)}
                    className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-dark"
                    title="Editar categoria"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(categoria.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-dark"
                    title="Excluir categoria"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {categorias.length === 0 && (
              <div className="text-center text-gray-400 py-8 bg-dark-lighter rounded-lg border border-gray-700">
                <Tag className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                <p>Nenhuma categoria cadastrada</p>
                <p className="text-sm mt-1">Clique em "Nova Categoria" para começar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}