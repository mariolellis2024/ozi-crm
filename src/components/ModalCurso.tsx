import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Categoria {
  id: string;
  nome: string;
}

interface ModalCursoProps {
  isOpen: boolean;
  editingId: string | null;
  formData: {
    nome: string;
    carga_horaria: string;
    preco: string;
    categoria_id: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    nome: string;
    carga_horaria: string;
    preco: string;
    categoria_id: string;
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
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [showCategoriaForm, setShowCategoriaForm] = useState(false);
  const [editingCategoriaId, setEditingCategoriaId] = useState<string | null>(null);
  const [categoriaFormData, setCategoriaFormData] = useState({ nome: '' });

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

  async function handleCategoriaSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!categoriaFormData.nome.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }
    
    try {
      if (editingCategoriaId) {
        const { error } = await supabase
          .from('categorias')
          .update(categoriaFormData)
          .eq('id', editingCategoriaId);
        
        if (error) throw error;
        toast.success('Categoria atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('categorias')
          .insert([{ nome: categoriaFormData.nome.trim() }]);
        
        if (error) throw error;
        toast.success('Categoria criada com sucesso!');
      }

      setCategoriaFormData({ nome: '' });
      setEditingCategoriaId(null);
      setShowCategoriaForm(false);
      await loadCategorias();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast.error(`Erro ao salvar categoria: ${error.message || 'Erro desconhecido'}`);
    }
  }

  async function handleDeleteCategoria(id: string) {
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
    } catch (error) {
      toast.error('Erro ao excluir categoria');
    }
  }

  function handleEditCategoria(categoria: Categoria) {
    setCategoriaFormData({ nome: categoria.nome });
    setEditingCategoriaId(categoria.id);
    setShowCategoriaForm(true);
  }

  function handleCancelCategoriaForm() {
    setCategoriaFormData({ nome: '' });
    setEditingCategoriaId(null);
    setShowCategoriaForm(false);
  }

  if (!isOpen) return null;

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
        className="bg-dark-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl transform transition-all"
        style={{
          borderRadius: '1rem',
          padding: '1.5rem',
          width: '100%',
          maxWidth: '42rem',
          maxHeight: '90vh',
          overflowY: 'auto',
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
            <label htmlFor="categoria_id" className="block text-sm font-medium text-gray-400 mb-1">
              Categoria
            </label>
            <div className="flex gap-2">
              <select
                id="categoria_id"
                value={formData.categoria_id}
                onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                className="flex-1 bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
              >
                <option value="">Selecione uma categoria</option>
                {categorias.map(categoria => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCategoriaForm(true)}
                className="px-3 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors"
                title="Gerenciar categorias"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showCategoriaForm && (
            <div className="bg-dark-lighter rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">
                  {editingCategoriaId ? 'Editar Categoria' : 'Nova Categoria'}
                </h3>
                <button
                  type="button"
                  onClick={handleCancelCategoriaForm}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCategoriaSubmit} className="space-y-4">
                <div>
                  <label htmlFor="categoria_nome" className="block text-sm font-medium text-gray-400 mb-1">
                    Nome da Categoria
                  </label>
                  <input
                    type="text"
                    id="categoria_nome"
                    value={categoriaFormData.nome}
                    onChange={(e) => setCategoriaFormData({ nome: e.target.value })}
                    className="w-full bg-dark border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-teal-accent text-dark font-medium rounded-lg px-4 py-2 hover:bg-teal-accent/90 transition-colors"
                >
                  {editingCategoriaId ? 'Atualizar Categoria' : 'Criar Categoria'}
                </button>
              </form>

              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Categorias Existentes</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {categorias.map(categoria => (
                    <div key={categoria.id} className="flex items-center justify-between bg-dark rounded-lg px-3 py-2">
                      <span className="text-white">{categoria.nome}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditCategoria(categoria)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategoria(categoria.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {categorias.length === 0 && (
                    <div className="text-center text-gray-400 py-2 text-sm">
                      Nenhuma categoria cadastrada
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
    document.body
  );
}